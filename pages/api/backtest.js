import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData } from "../../lib/marketData";
import { runBacktest } from "../../lib/backtest";

export default async function handler(req, res) {
  const coinId = req.query.coin || "bitcoin";
  const days = Math.min(Math.max(parseInt(req.query.days) || 365, 90), 365);
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  try {
    const [series, macro, fg] = await Promise.all([
      fetchHistoricalSeries(coinId, days),
      fetchMacroData(60),
      fetchFearGreedData(500).catch(() => ({ history: [] })),
    ]);

    if (series.prices.length < 40) {
      return res.status(400).json({ error: "Nicht genug historische Daten für einen Backtest." });
    }

    const result = runBacktest({
      prices: series.prices.map((p) => p.v),
      volumes: series.volumes.map((v) => v.v),
      dates: series.prices.map((p) => p.t),
      macro,
      fearGreedHistory: fg.history,
    });

    res.status(200).json({ coin, days, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Backtest fehlgeschlagen." });
  }
}
