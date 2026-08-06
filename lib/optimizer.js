// Rastersuche über SMA-Perioden × RSI-Schwellen × ADX-Schwellen, um zu prüfen,
// ob andere Parameter als die Dashboard-Standardwerte robust besser abschneiden
// – "robust" heißt hier: nicht nur auf dem Trainings-Zeitraum gut, sondern auch
// auf einem Test-Zeitraum, den die Suche nie gesehen hat (Out-of-Sample-Check).
// Ohne diesen Check würde man zwangsläufig die Kombination finden, die zufällig
// am besten zur vorhandenen Historie passt (Overfitting), nicht die mit echter
// Kante.

import { runBacktest } from "./backtest";

const SMA_GRID = [
  [5, 20],
  [8, 21],
  [10, 30],
  [15, 40],
  [20, 50],
];

const RSI_GRID = [
  [20, 80],
  [25, 75],
  [30, 70],
  [35, 65],
];

const ADX_GRID = [null, 15, 20, 25];

export const GRID_SIZE = SMA_GRID.length * RSI_GRID.length * ADX_GRID.length;

function summarize(result) {
  return {
    totalReturnPct: result.totalReturnPct,
    sharpe: result.sharpe,
    sortino: result.sortino,
    maxDrawdown: result.maxDrawdown,
    tradeCount: result.tradeCount,
    winRate: result.winRate,
  };
}

function slice(arr, from, to) {
  return arr ? arr.slice(from, to) : arr;
}

export function runOptimization({
  prices,
  highs,
  lows,
  volumes,
  dates,
  macro,
  fearGreedHistory,
  fundingRates,
  stopLossPct = null,
  allowShort = false,
  leverage = 1,
  trainRatio = 0.7,
  topN = 5,
}) {
  const splitIdx = Math.floor(prices.length * trainRatio);

  const trainSet = {
    prices: prices.slice(0, splitIdx),
    highs: slice(highs, 0, splitIdx),
    lows: slice(lows, 0, splitIdx),
    volumes: volumes.slice(0, splitIdx),
    dates: dates.slice(0, splitIdx),
  };
  const testSet = {
    prices: prices.slice(splitIdx),
    highs: slice(highs, splitIdx, undefined),
    lows: slice(lows, splitIdx, undefined),
    volumes: volumes.slice(splitIdx),
    dates: dates.slice(splitIdx),
  };

  const shared = { macro, fearGreedHistory, fundingRates, stopLossPct, allowShort, leverage };

  const results = [];
  for (const [smaFast, smaSlow] of SMA_GRID) {
    for (const [rsiBuyThreshold, rsiSellThreshold] of RSI_GRID) {
      for (const adxThreshold of ADX_GRID) {
        const params = { smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold };
        const trainResult = runBacktest({ ...trainSet, ...shared, ...params });
        results.push({ params, train: summarize(trainResult) });
      }
    }
  }

  // Nach Trainings-Sharpe sortieren (risikoadjustiert statt reine Rendite,
  // sonst bevorzugt die Suche riskante statt gute Kombinationen).
  results.sort((a, b) => (b.train.sharpe ?? -Infinity) - (a.train.sharpe ?? -Infinity));
  const top = results.slice(0, topN);

  for (const r of top) {
    const testResult = runBacktest({ ...testSet, ...shared, ...r.params });
    r.test = summarize(testResult);
  }

  return {
    combinationsTestedCount: results.length,
    trainDays: trainSet.prices.length,
    testDays: testSet.prices.length,
    splitDate: dates[splitIdx] ? new Date(dates[splitIdx]).toISOString().slice(0, 10) : null,
    top,
  };
}
