import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData, fetchFundingRateHistory } from "../../lib/marketData";
import { runBacktest } from "../../lib/backtest";

const MAX_DAYS = 1825; // 5 Jahre – Binance hat die Historie, mehr macht die Anfrage nur langsamer
const MAX_LEVERAGE = 10;

export default async function handler(req, res) {
  const coinId = req.query.coin || "bitcoin";
  const days = Math.min(Math.max(parseInt(req.query.days) || 365, 90), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const allowShort = req.query.short === "1";
  const leverage = Math.min(Math.max(parseInt(req.query.leverage) || 1, 1), MAX_LEVERAGE);
  // Optionale Strategie-Parameter (z.B. um eine vom Optimizer gefundene Kombination
  // manuell nachzustellen). Ohne Angabe identisch zum bisherigen Standardverhalten.
  const smaFast = req.query.smaFast ? parseInt(req.query.smaFast) : undefined;
  const smaSlow = req.query.smaSlow ? parseInt(req.query.smaSlow) : undefined;
  const rsiBuyThreshold = req.query.rsiBuy ? parseFloat(req.query.rsiBuy) : undefined;
  const rsiSellThreshold = req.query.rsiSell ? parseFloat(req.query.rsiSell) : undefined;
  const adxThreshold = req.query.adx ? parseFloat(req.query.adx) : null;
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  // Funding fällt nur an, wenn tatsächlich ein Perpetual simuliert wird
  // (Short oder Leverage) – reiner Spot-Long braucht den zusätzlichen Fetch nicht.
  const usesPerpetual = allowShort || leverage > 1;

  try {
    const [series, macro, fg, funding] = await Promise.all([
      fetchHistoricalSeries(coinId, days),
      fetchMacroData(Math.ceil(days / 30) + 20, days + 120),
      fetchFearGreedData(Math.min(days + 60, 3000)).catch(() => ({ history: [] })),
      usesPerpetual ? fetchFundingRateHistory(coinId, days).catch(() => []) : Promise.resolve(null),
    ]);

    if (series.prices.length < 40) {
      return res.status(400).json({ error: "Nicht genug historische Daten für einen Backtest." });
    }

    const result = runBacktest({
      prices: series.prices.map((p) => p.v),
      highs: series.highs.map((h) => h.v),
      lows: series.lows.map((l) => l.v),
      volumes: series.volumes.map((v) => v.v),
      dates: series.prices.map((p) => p.t),
      macro,
      fearGreedHistory: fg.history,
      stopLossPct,
      allowShort,
      leverage,
      fundingRates: funding,
      smaFast,
      smaSlow,
      rsiBuyThreshold,
      rsiSellThreshold,
      adxThreshold,
    });

    res.status(200).json({ coin, days, stopLossPct, allowShort, leverage, smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Backtest fehlgeschlagen." });
  }
}
