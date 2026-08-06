// Simuliert die exakt gleiche Signal-Logik wie das Dashboard (lib/signals.js)
// Tag für Tag über eine historische Kursreihe, um zu prüfen, wie die Strategie
// in der Vergangenheit performt hätte. Kein Lookahead: an Tag i fließen nur
// Kurs-/Volumen-/Makro-/FearGreed-Daten bis einschließlich Tag i ein.

import { computeMACD, macdSignal, volumeSignal, computeRSI, smaSignal, computeMacroRegime, combineSignal, computeADX } from "./signals";

const STARTING_CASH = 10000;
// MACD(12/26) + Signallinie(9) braucht am meisten Vorlauf (~34 Werte) von allen
// verwendeten Indikatoren, SMA(30) und RSI(14) sind schon vorher startklar.
const WARMUP_DAYS = 35;

function closestFearGreed(history, targetTs) {
  if (!history || !history.length) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const h of history) {
    const diff = Math.abs(h.ts - targetTs);
    if (diff < bestDiff) {
      best = h;
      bestDiff = diff;
    }
  }
  return best ? best.value : null;
}

// stopLossPct: z.B. 15 => Position wird geschlossen, sobald das Tagestief/-hoch
// 15% gegen den Einstiegspreis läuft (Ausführung zum Stop-Preis selbst, nicht
// zum Tagesextrem – übliche vereinfachende Annahme für Backtests). null/0 = aus.
//
// allowShort: bei "Verkaufen"-Signal wird statt in Cash zu gehen eine
// Short-Position eröffnet (gespiegelte Long-Logik).
//
// leverage: 1 = ungehebelt (Standard). >1 verstärkt Preisbewegungen
// proportional UND führt eine Liquidationsschwelle ein: bewegt sich der Preis
// um 100%/leverage gegen die Position, ist die Margin aufgebraucht
// (liquidiert) – das ist ein eigener, vom Stop-Loss unabhängiger Preis-Trigger,
// beide werden geprüft und der zuerst erreichte gewinnt.
//
// fundingRates: [{t, rate}] von Binance-Perpetuals (alle 8h). Long zahlt bei
// positiver Rate, Short erhält (und umgekehrt) – wird täglich aufsummiert und
// als Multiplikator auf die Positions-Margin angewendet, unabhängig vom
// Stop-/Liquidations-Preis-Trigger (genau wie an echten Börsen: Funding
// verändert die Margin, nicht den Liquidationspreis selbst).
export function runBacktest({
  prices,
  highs,
  lows,
  volumes,
  dates,
  macro,
  fearGreedHistory,
  stopLossPct = null,
  allowShort = false,
  leverage = 1,
  fundingRates = null,
  smaFast = 10,
  smaSlow = 30,
  rsiBuyThreshold = 30,
  rsiSellThreshold = 70,
  adxThreshold = null,
}) {
  const equityCurve = [];
  const trades = [];
  let cash = STARTING_CASH;
  let direction = null; // "long" | "short" | null
  let entryPrice = null;
  let entryDate = null;
  let marginAtEntry = null;
  let fundingFactor = 1;

  const buyHoldCoins = STARTING_CASH / prices[0];

  // Mehrere 8h-Funding-Events pro Tag zu einer Tagesrate zusammenfassen, damit
  // sie sich sauber in die tägliche Simulationsschleife einfügen.
  const fundingByDate = new Map();
  if (fundingRates) {
    for (const f of fundingRates) {
      const d = new Date(f.t).toISOString().slice(0, 10);
      fundingByDate.set(d, (fundingByDate.get(d) || 0) + f.rate);
    }
  }

  function priceRatio(atPrice) {
    const move = (atPrice - entryPrice) / entryPrice;
    return 1 + (direction === "long" ? leverage * move : -leverage * move);
  }

  function positionValueAt(atPrice) {
    return Math.max(marginAtEntry * fundingFactor * priceRatio(atPrice), 0);
  }

  function openPosition(dir, price, dateStr) {
    direction = dir;
    entryPrice = price;
    entryDate = dateStr;
    marginAtEntry = cash;
    fundingFactor = 1;
    cash = 0;
  }

  function closePosition(exitPrice, dateStr, extra = {}) {
    const value = positionValueAt(exitPrice);
    trades.push({
      direction,
      leverage,
      entryDate,
      entryPrice,
      exitDate: dateStr,
      exitPrice,
      returnPct: ((value - marginAtEntry) / marginAtEntry) * 100,
      ...extra,
    });
    cash = value;
    direction = null;
    entryPrice = null;
    entryDate = null;
    marginAtEntry = null;
    fundingFactor = 1;
  }

  for (let i = 0; i < prices.length; i++) {
    const date = dates[i];
    const dateStr = new Date(date).toISOString().slice(0, 10);
    const price = prices[i];
    const low = lows ? lows[i] : price;
    const high = highs ? highs[i] : price;

    if (direction) {
      const liqDistancePct = 100 / leverage;
      const isLiqTighter = !stopLossPct || liqDistancePct <= stopLossPct;
      const effectivePct = stopLossPct ? Math.min(stopLossPct, liqDistancePct) : liqDistancePct;

      if (direction === "long") {
        const stopPrice = entryPrice * (1 - effectivePct / 100);
        if (low <= stopPrice) {
          closePosition(stopPrice, dateStr, isLiqTighter ? { liquidated: true } : { stoppedOut: true });
        }
      } else if (direction === "short") {
        const stopPrice = entryPrice * (1 + effectivePct / 100);
        if (high >= stopPrice) {
          closePosition(stopPrice, dateStr, isLiqTighter ? { liquidated: true } : { stoppedOut: true });
        }
      }
    }

    let combined = { label: "Neutral", cls: "badge-gray" };
    if (i >= WARMUP_DAYS) {
      const slicePrices = prices.slice(0, i + 1);
      const sliceVolumes = volumes.slice(0, i + 1);

      const rsi = computeRSI(slicePrices);
      const smaSig = smaSignal(slicePrices, smaFast, smaSlow);
      const macd = computeMACD(slicePrices);
      const macdSig = macdSignal(macd);
      const volSig = volumeSignal(sliceVolumes);
      const adx = adxThreshold != null && highs && lows ? computeADX(highs.slice(0, i + 1), lows.slice(0, i + 1), slicePrices) : null;

      const macroAsOf = computeMacroRegime(
        macro.m2.filter((o) => o.date <= dateStr),
        macro.fedfunds.filter((o) => o.date <= dateStr),
        macro.dxy.filter((o) => o.date <= dateStr),
        macro.yield10y.filter((o) => o.date <= dateStr),
        macro.vix.filter((o) => o.date <= dateStr)
      );
      const fg = closestFearGreed(fearGreedHistory, date);

      combined = combineSignal(smaSig, rsi, macroAsOf, fg, macdSig, volSig, { adx, adxThreshold, rsiBuyThreshold, rsiSellThreshold });
    }

    // Ein liquidiertes/leergeräumtes Konto (cash <= 0) kann nicht mehr weiterhandeln –
    // sonst entstünde bei der nächsten Positionseröffnung eine 0/0-Rendite (NaN).
    if (cash > 0) {
      if (combined.label === "Kaufen" && direction !== "long") {
        if (direction === "short") closePosition(price, dateStr);
        openPosition("long", price, dateStr);
      } else if (combined.label === "Verkaufen" && direction !== "short") {
        if (direction === "long") closePosition(price, dateStr);
        if (allowShort) openPosition("short", price, dateStr);
      }
    }

    if (direction && fundingByDate.has(dateStr)) {
      const dailyRate = fundingByDate.get(dateStr);
      const fundingCostPct = (direction === "long" ? 1 : -1) * leverage * dailyRate;
      fundingFactor *= 1 - fundingCostPct;
    }

    const equity = direction ? positionValueAt(price) : cash;
    equityCurve.push({ date: dateStr, equity, buyHoldEquity: buyHoldCoins * price, signal: combined.label, direction });
  }

  const lastPrice = prices[prices.length - 1];
  if (direction) {
    closePosition(lastPrice, new Date(dates[dates.length - 1]).toISOString().slice(0, 10), { openAtEnd: true });
  }

  const finalEquity = cash;
  const buyHoldFinal = buyHoldCoins * lastPrice;

  const wins = trades.filter((t) => t.returnPct > 0).length;
  const liquidationCount = trades.filter((t) => t.liquidated).length;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, ((peak - point.equity) / peak) * 100);
  }

  const { sharpe, sortino } = computeRiskAdjustedRatios(equityCurve);

  return {
    startingCash: STARTING_CASH,
    finalEquity,
    totalReturnPct: ((finalEquity - STARTING_CASH) / STARTING_CASH) * 100,
    buyHoldFinal,
    buyHoldReturnPct: ((buyHoldFinal - STARTING_CASH) / STARTING_CASH) * 100,
    trades,
    tradeCount: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : null,
    liquidationCount,
    maxDrawdown,
    sharpe,
    sortino,
    equityCurve,
  };
}

// Annualisierte Sharpe/Sortino Ratio aus den täglichen Equity-Renditen.
// Ohne risikofreien Zinssatz (vereinfachend 0 angenommen) – bei Krypto-
// Volatilität ist das für den Strategievergleich untereinander ausreichend.
// Sortino nutzt nur die Abwärts-Volatilität (Downside Deviation), Sharpe die
// gesamte Volatilität.
function computeRiskAdjustedRatios(equityCurve) {
  const dailyReturns = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1].equity;
    const cur = equityCurve[i].equity;
    if (prev > 0) dailyReturns.push((cur - prev) / prev);
  }
  if (dailyReturns.length < 2) return { sharpe: null, sortino: null };

  const mean = dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length;
  const variance = dailyReturns.reduce((a, b) => a + (b - mean) ** 2, 0) / dailyReturns.length;
  const std = Math.sqrt(variance);

  const downside = dailyReturns.filter((r) => r < 0);
  const downsideVariance = downside.length ? downside.reduce((a, b) => a + b * b, 0) / downside.length : 0;
  const downsideStd = Math.sqrt(downsideVariance);

  const annualization = Math.sqrt(365);
  return {
    sharpe: std === 0 ? null : (mean / std) * annualization,
    sortino: downsideStd === 0 ? null : (mean / downsideStd) * annualization,
  };
}
