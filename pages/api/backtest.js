import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData, fetchFundingRateHistory } from "../../lib/marketData";
import { runBacktest } from "../../lib/backtest";
import { requireActiveAccessApi } from "../../lib/auth/requireActiveAccessApi";

const MAX_DAYS = 3000; // ~8,2 Jahre – BTCUSDT/ETHUSDT sind seit 2017 auf Binance gelistet
const MAX_LEVERAGE = 10;

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const coinId = req.query.coin || "bitcoin";
  const days = Math.min(Math.max(parseInt(req.query.days) || 365, 90), MAX_DAYS);
  const stopLossPct = req.query.stopLoss ? Math.min(Math.max(parseFloat(req.query.stopLoss), 1), 90) : null;
  const takeProfitPct = req.query.takeProfit ? Math.min(Math.max(parseFloat(req.query.takeProfit), 1), 500) : null;
  const allowShort = req.query.short === "1";
  const leverage = Math.min(Math.max(parseInt(req.query.leverage) || 1, 1), MAX_LEVERAGE);
  // Optionale Strategie-Parameter (z.B. um eine vom Optimizer gefundene Kombination
  // manuell nachzustellen). Ohne Angabe identisch zum bisherigen Standardverhalten.
  const smaFast = req.query.smaFast ? parseInt(req.query.smaFast) : undefined;
  const smaSlow = req.query.smaSlow ? parseInt(req.query.smaSlow) : undefined;
  const rsiBuyThreshold = req.query.rsiBuy ? parseFloat(req.query.rsiBuy) : undefined;
  const rsiSellThreshold = req.query.rsiSell ? parseFloat(req.query.rsiSell) : undefined;
  const adxThreshold = req.query.adx ? parseFloat(req.query.adx) : null;
  const costPct = req.query.cost != null ? Math.min(Math.max(parseFloat(req.query.cost), 0), 2) : 0.15;
  // Isolationsschalter für die einzelnen Signal-Bestandteile (siehe
  // combineSignal) – für gezielte Vergleichsläufe, Default jeweils an/0.3.
  const useSma = req.query.sma !== "0";
  const useMacd = req.query.macd !== "0";
  const useRsi = req.query.rsi !== "0";
  const useFg = req.query.fg !== "0";
  const useMacro = req.query.macro !== "0";
  const useVolume = req.query.vol !== "0";
  const useNasdaq = req.query.nasdaq === "1";
  const useBollinger = req.query.boll === "1";
  const useStochRsi = req.query.stoch === "1";
  const useObv = req.query.obv === "1";
  const useStrongCandle = req.query.candle === "1";
  const useMarubozu = req.query.marubozu === "1";
  const macroWeight = req.query.macroWeight != null ? parseFloat(req.query.macroWeight) : 2.0;
  const signalThreshold = req.query.threshold != null ? parseFloat(req.query.threshold) : 1.5;
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  // Funding fällt nur an, wenn tatsächlich ein Perpetual simuliert wird
  // (Short oder Leverage) – reiner Spot-Long braucht den zusätzlichen Fetch nicht.
  const usesPerpetual = allowShort || leverage > 1;

  try {
    const [series, macro, fg, funding] = await Promise.all([
      fetchHistoricalSeries(coinId, days),
      fetchMacroData(Math.ceil(days / 30) + 20, days + 120),
      fetchFearGreedData(Math.min(days + 60, 3500)).catch(() => ({ history: [] })),
      usesPerpetual ? fetchFundingRateHistory(coinId, days).catch(() => []) : Promise.resolve(null),
    ]);

    if (series.prices.length < 40) {
      return res.status(400).json({ error: "Nicht genug historische Daten für einen Backtest." });
    }

    const result = runBacktest({
      prices: series.prices.map((p) => p.v),
      opens: series.opens.map((o) => o.v),
      highs: series.highs.map((h) => h.v),
      lows: series.lows.map((l) => l.v),
      volumes: series.volumes.map((v) => v.v),
      dates: series.prices.map((p) => p.t),
      macro,
      fearGreedHistory: fg.history,
      stopLossPct,
      takeProfitPct,
      allowShort,
      leverage,
      fundingRates: funding,
      smaFast,
      smaSlow,
      rsiBuyThreshold,
      rsiSellThreshold,
      adxThreshold,
      costPct,
      useSma,
      useMacd,
      useRsi,
      useFg,
      useMacro,
      useVolume,
      useNasdaq,
      useBollinger,
      useStochRsi,
      useObv,
      useStrongCandle,
      useMarubozu,
      macroWeight,
      signalThreshold,
    });

    res.status(200).json({ coin, days, stopLossPct, takeProfitPct, allowShort, leverage, smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold, costPct, useSma, useMacd, useRsi, useFg, useMacro, useVolume, useNasdaq, useBollinger, useStochRsi, useObv, useStrongCandle, useMarubozu, macroWeight, signalThreshold, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message || "Backtest fehlgeschlagen." });
  }
}
