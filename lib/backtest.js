// Simuliert die exakt gleiche Signal-Logik wie das Dashboard (lib/signals.js)
// Tag für Tag über eine historische Kursreihe, um zu prüfen, wie die Strategie
// in der Vergangenheit performt hätte. Kein Lookahead: an Tag i fließen nur
// Kurs-/Volumen-/Makro-/FearGreed-Daten bis einschließlich Tag i ein.

import { computeMACD, macdSignal, volumeSignal, computeRSI, smaSignal, computeMacroRegime, combineSignal } from "./signals";

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

// stopLossPct: z.B. 15 => Position wird geschlossen, sobald das Tagestief
// 15% unter dem Einstiegspreis liegt (Ausführung zum Stop-Preis selbst, nicht
// zum Tagestief – übliche vereinfachende Annahme für Backtests). null/0 = aus.
export function runBacktest({ prices, lows, volumes, dates, macro, fearGreedHistory, stopLossPct = null }) {
  const equityCurve = [];
  const trades = [];
  let cash = STARTING_CASH;
  let coins = 0;
  let inPosition = false;
  let entryPrice = null;
  let entryDate = null;

  const buyHoldCoins = STARTING_CASH / prices[0];

  for (let i = 0; i < prices.length; i++) {
    const date = dates[i];
    const dateStr = new Date(date).toISOString().slice(0, 10);
    const price = prices[i];
    const low = lows ? lows[i] : price;

    if (inPosition && stopLossPct) {
      const stopPrice = entryPrice * (1 - stopLossPct / 100);
      if (low <= stopPrice) {
        cash = coins * stopPrice;
        trades.push({
          entryDate,
          entryPrice,
          exitDate: dateStr,
          exitPrice: stopPrice,
          returnPct: -stopLossPct,
          stoppedOut: true,
        });
        coins = 0;
        inPosition = false;
        entryPrice = null;
        entryDate = null;
      }
    }

    let combined = { label: "Neutral", cls: "badge-gray" };
    if (i >= WARMUP_DAYS) {
      const slicePrices = prices.slice(0, i + 1);
      const sliceVolumes = volumes.slice(0, i + 1);

      const rsi = computeRSI(slicePrices);
      const smaSig = smaSignal(slicePrices, 10, 30);
      const macd = computeMACD(slicePrices);
      const macdSig = macdSignal(macd);
      const volSig = volumeSignal(sliceVolumes);

      const macroAsOf = computeMacroRegime(
        macro.m2.filter((o) => o.date <= dateStr),
        macro.fedfunds.filter((o) => o.date <= dateStr)
      );
      const fg = closestFearGreed(fearGreedHistory, date);

      combined = combineSignal(smaSig, rsi, macroAsOf, fg, macdSig, volSig);
    }

    if (combined.label === "Kaufen" && !inPosition) {
      coins = cash / price;
      cash = 0;
      inPosition = true;
      entryPrice = price;
      entryDate = dateStr;
    } else if (combined.label === "Verkaufen" && inPosition) {
      cash = coins * price;
      trades.push({
        entryDate,
        entryPrice,
        exitDate: dateStr,
        exitPrice: price,
        returnPct: ((price - entryPrice) / entryPrice) * 100,
      });
      coins = 0;
      inPosition = false;
      entryPrice = null;
      entryDate = null;
    }

    const equity = inPosition ? coins * price : cash;
    equityCurve.push({ date: dateStr, equity, buyHoldEquity: buyHoldCoins * price, signal: combined.label });
  }

  const lastPrice = prices[prices.length - 1];
  if (inPosition) {
    cash = coins * lastPrice;
    trades.push({
      entryDate,
      entryPrice,
      exitDate: new Date(dates[dates.length - 1]).toISOString().slice(0, 10),
      exitPrice: lastPrice,
      returnPct: ((lastPrice - entryPrice) / entryPrice) * 100,
      openAtEnd: true,
    });
  }

  const finalEquity = cash;
  const buyHoldFinal = buyHoldCoins * lastPrice;

  const wins = trades.filter((t) => t.returnPct > 0).length;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, ((peak - point.equity) / peak) * 100);
  }

  return {
    startingCash: STARTING_CASH,
    finalEquity,
    totalReturnPct: ((finalEquity - STARTING_CASH) / STARTING_CASH) * 100,
    buyHoldFinal,
    buyHoldReturnPct: ((buyHoldFinal - STARTING_CASH) / STARTING_CASH) * 100,
    trades,
    tradeCount: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : null,
    maxDrawdown,
    equityCurve,
  };
}
