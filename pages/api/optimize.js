import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData, fetchFundingRateHistory } from "../../lib/marketData";
import { runOptimization } from "../../lib/optimizer";

export const config = { maxDuration: 60 };

const MAX_DAYS = 1825;

export default async function handler(req, res) {
  const coinId = req.query.coin || "bitcoin";
  const days = Math.min(Math.max(parseInt(req.query.days) || 730, 180), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const allowShort = req.query.short === "1";
  const leverage = Math.min(Math.max(parseInt(req.query.leverage) || 1, 1), 10);
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  const usesPerpetual = allowShort || leverage > 1;

  try {
    const [series, macro, fg, funding] = await Promise.all([
      fetchHistoricalSeries(coinId, days),
      fetchMacroData(Math.ceil(days / 30) + 20, days + 120),
      fetchFearGreedData(Math.min(days + 60, 3000)).catch(() => ({ history: [] })),
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
    });

    res.status(200).json({ coin, days, stopLossPct, allowShort, leverage, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Optimierung fehlgeschlagen." });
  }
}
