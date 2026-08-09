import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData, fetchFundingRateHistory } from "../../lib/marketData";
import { runOptimization, runMultiCoinOptimization } from "../../lib/optimizer";
import { requireActiveAccessApi } from "../../lib/auth/requireActiveAccessApi";

export const config = { maxDuration: 60 };

const MAX_DAYS = 3000; // ~8,2 Jahre – BTCUSDT/ETHUSDT sind seit 2017 auf Binance gelistet

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const days = Math.min(Math.max(parseInt(req.query.days) || 730, 180), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const allowShort = req.query.short === "1";
  const leverage = Math.min(Math.max(parseInt(req.query.leverage) || 1, 1), 10);
  const costPct = req.query.cost != null ? Math.min(Math.max(parseFloat(req.query.cost), 0), 2) : 0.15;
  const multiCoin = req.query.mode === "multi";

  const usesPerpetual = allowShort || leverage > 1;

  try {
    const macroAndFg = Promise.all([
      fetchMacroData(Math.ceil(days / 30) + 20, days + 120),
      fetchFearGreedData(Math.min(days + 60, 3500)).catch(() => ({ history: [] })),
    ]);

    if (multiCoin) {
      const [[macro, fg], seriesPerCoin] = await Promise.all([
        macroAndFg,
        Promise.all(
          COINS.map(async (coin) => {
            const [series, funding] = await Promise.all([
              fetchHistoricalSeries(coin.id, days),
              usesPerpetual ? fetchFundingRateHistory(coin.id, days).catch(() => []) : Promise.resolve(null),
            ]);
            return { coin, series, funding };
          })
        ),
      ]);

      const coinDatasets = seriesPerCoin
        .filter(({ series }) => series.prices.length >= 180)
        .map(({ coin, series, funding }) => ({
          coinId: coin.id,
          symbol: coin.symbol,
          prices: series.prices.map((p) => p.v),
          highs: series.highs.map((h) => h.v),
          lows: series.lows.map((l) => l.v),
          volumes: series.volumes.map((v) => v.v),
          dates: series.prices.map((p) => p.t),
          fundingRates: funding,
        }));

      if (coinDatasets.length < 2) {
        return res.status(400).json({ error: "Nicht genug historische Daten für eine Multi-Coin-Optimierung." });
      }

      const result = runMultiCoinOptimization({
        coinDatasets,
        macro,
        fearGreedHistory: fg.history,
        stopLossPct,
        allowShort,
        leverage,
        costPct,
      });

      return res.status(200).json({ mode: "multi", days, stopLossPct, allowShort, leverage, costPct, ...result });
    }

    const coinId = req.query.coin || "bitcoin";
    const coin = COINS.find((c) => c.id === coinId);
    if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

    const [[macro, fg], series, funding] = await Promise.all([
      macroAndFg,
      fetchHistoricalSeries(coinId, days),
      usesPerpetual ? fetchFundingRateHistory(coinId, days).catch(() => []) : Promise.resolve(null),
    ]);

    if (series.prices.length < 180) {
      return res.status(400).json({ error: "Nicht genug historische Daten für eine Optimierung (mind. 180 Tage)." });
    }

    const result = runOptimization({
      prices: series.prices.map((p) => p.v),
      highs: series.highs.map((h) => h.v),
      lows: series.lows.map((l) => l.v),
      volumes: series.volumes.map((v) => v.v),
      dates: series.prices.map((p) => p.t),
      macro,
      fearGreedHistory: fg.history,
      fundingRates: funding,
      stopLossPct,
      allowShort,
      leverage,
      costPct,
    });

    res.status(200).json({ mode: "single", coin, days, stopLossPct, allowShort, leverage, costPct, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Optimierung fehlgeschlagen." });
  }
}
