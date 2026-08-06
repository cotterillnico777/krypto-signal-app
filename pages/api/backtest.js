import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData } from "../../lib/marketData";
import { runBacktest } from "../../lib/backtest";

const MAX_DAYS = 1825; // 5 Jahre – Binance hat die Historie, mehr macht die Anfrage nur langsamer

export default async function handler(req, res) {
  const coinId = req.query.coin || "bitcoin";
  const days = Math.min(Math.max(parseInt(req.query.days) || 365, 90), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  try {
    const [series, macro, fg] = await Promise.all([
      fetchHistoricalSeries(coinId, days),
      fetchMacroData(Math.ceil(days / 30) + 20),
      fetchFearGreedData(Math.min(days + 60, 3000)).catch(() => ({ history: [] })),
    ]);

    if (series.prices.length < 40) {
      return res.status(400).json({ error: "Nicht genug historische Daten für einen Backtest." });
    }

    const result = runBacktest({
      prices: series.prices.map((p) => p.v),
      lows: series.lows.map((l) => l.v),
      volumes: series.volumes.map((v) => v.v),
      dates: series.prices.map((p) => p.t),
      macro,
      fearGreedHistory: fg.history,
      stopLossPct,
    });

    res.status(200).json({ coin, days, stopLossPct, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Backtest fehlgeschlagen." });
  }
}
