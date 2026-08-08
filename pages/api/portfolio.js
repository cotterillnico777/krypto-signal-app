import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData, fetchFundingRateHistory } from "../../lib/marketData";
import { runPortfolioBacktest } from "../../lib/backtest";

export const config = { maxDuration: 30 };

const MAX_DAYS = 3000; // ~8,2 Jahre – BTCUSDT/ETHUSDT sind seit 2017 auf Binance gelistet
const MAX_LEVERAGE = 10;

export default async function handler(req, res) {
  const days = Math.min(Math.max(parseInt(req.query.days) || 730, 90), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const allowShort = req.query.short === "1";
  const leverage = Math.min(Math.max(parseInt(req.query.leverage) || 1, 1), MAX_LEVERAGE);
  const costPct = req.query.cost != null ? Math.min(Math.max(parseFloat(req.query.cost), 0), 2) : 0.15;

  const usesPerpetual = allowShort || leverage > 1;

  try {
    const [macro, fg, seriesPerCoin] = await Promise.all([
      fetchMacroData(Math.ceil(days / 30) + 20, days + 120),
      fetchFearGreedData(Math.min(days + 60, 3500)).catch(() => ({ history: [] })),
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
      .filter(({ series }) => series.prices.length >= 40)
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
      return res.status(400).json({ error: "Nicht genug historische Daten für einen Portfolio-Backtest." });
    }

    const result = runPortfolioBacktest({
      coinDatasets,
      macro,
      fearGreedHistory: fg.history,
      stopLossPct,
      allowShort,
      leverage,
      costPct,
    });

    res.status(200).json({ requestedDays: days, stopLossPct, allowShort, leverage, costPct, coins: coinDatasets.map((c) => c.symbol), ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Portfolio-Backtest fehlgeschlagen." });
  }
}
