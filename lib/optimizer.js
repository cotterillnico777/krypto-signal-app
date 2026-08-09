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
  costPct = 0.15,
  useBollinger = false,
  useStochRsi = false,
  useObv = false,
  useStrongCandle = false,
  useSma = true,
  useMacd = true,
  useRsi = true,
  useFg = true,
  useMacro = true,
  useVolume = true,
  macroWeight = 2.0,
  signalThreshold = 1.5,
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

  const shared = { macro, fearGreedHistory, fundingRates, stopLossPct, allowShort, leverage, costPct, useBollinger, useStochRsi, useObv, useStrongCandle, useSma, useMacd, useRsi, useFg, useMacro, useVolume, macroWeight, signalThreshold };

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

// Wie runOptimization, aber über mehrere Coins gleichzeitig: eine Kombination,
// die nur bei einem Coin (oft nur ein einzelner dominanter Trade) gut aussieht,
// aber bei den anderen vier nicht, ist statistisch nicht überzeugend. Rangiert
// nach durchschnittlichem Sharpe über alle Coins, zeigt aber pro Coin einzeln,
// damit man Konsistenz von Zufall unterscheiden kann.
//
// coinDatasets: [{ coinId, symbol, prices, highs, lows, volumes, dates, fundingRates }]
export function runMultiCoinOptimization({
  coinDatasets,
  macro,
  fearGreedHistory,
  stopLossPct = null,
  allowShort = false,
  leverage = 1,
  costPct = 0.15,
  useBollinger = false,
  useStochRsi = false,
  useObv = false,
  useStrongCandle = false,
  useSma = true,
  useMacd = true,
  useRsi = true,
  useFg = true,
  useMacro = true,
  useVolume = true,
  macroWeight = 2.0,
  signalThreshold = 1.5,
  trainRatio = 0.7,
  topN = 5,
}) {
  const shared = { macro, fearGreedHistory, stopLossPct, allowShort, leverage, costPct, useBollinger, useStochRsi, useObv, useStrongCandle, useSma, useMacd, useRsi, useFg, useMacro, useVolume, macroWeight, signalThreshold };

  const perCoinSplit = coinDatasets.map((c) => {
    const splitIdx = Math.floor(c.prices.length * trainRatio);
    return {
      coinId: c.coinId,
      symbol: c.symbol,
      fundingRates: c.fundingRates,
      splitDate: c.dates[splitIdx] ? new Date(c.dates[splitIdx]).toISOString().slice(0, 10) : null,
      train: {
        prices: c.prices.slice(0, splitIdx),
        highs: slice(c.highs, 0, splitIdx),
        lows: slice(c.lows, 0, splitIdx),
        volumes: c.volumes.slice(0, splitIdx),
        dates: c.dates.slice(0, splitIdx),
      },
      test: {
        prices: c.prices.slice(splitIdx),
        highs: slice(c.highs, splitIdx, undefined),
        lows: slice(c.lows, splitIdx, undefined),
        volumes: c.volumes.slice(splitIdx),
        dates: c.dates.slice(splitIdx),
      },
    };
  });

  function runAcrossCoins(period, params) {
    const perCoin = perCoinSplit.map((c) => {
      const r = runBacktest({ ...c[period], ...shared, fundingRates: c.fundingRates, ...params });
      return { coinId: c.coinId, symbol: c.symbol, ...summarize(r) };
    });
    const sharpes = perCoin.map((p) => p.sharpe).filter((s) => s != null);
    const avgSharpe = sharpes.length ? sharpes.reduce((a, b) => a + b, 0) / sharpes.length : null;
    const avgReturnPct = perCoin.reduce((a, p) => a + p.totalReturnPct, 0) / perCoin.length;
    const positiveCoinCount = perCoin.filter((p) => p.totalReturnPct > 0).length;
    return { avgSharpe, avgReturnPct, positiveCoinCount, totalCoinCount: perCoin.length, perCoin };
  }

  const results = [];
  for (const [smaFast, smaSlow] of SMA_GRID) {
    for (const [rsiBuyThreshold, rsiSellThreshold] of RSI_GRID) {
      for (const adxThreshold of ADX_GRID) {
        const params = { smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold };
        results.push({ params, train: runAcrossCoins("train", params) });
      }
    }
  }

  results.sort((a, b) => (b.train.avgSharpe ?? -Infinity) - (a.train.avgSharpe ?? -Infinity));
  const top = results.slice(0, topN);

  for (const r of top) {
    r.test = runAcrossCoins("test", r.params);
  }

  return {
    combinationsTestedCount: results.length,
    coins: coinDatasets.map((c) => c.symbol),
    trainDays: perCoinSplit[0]?.train.prices.length ?? 0,
    testDays: perCoinSplit[0]?.test.prices.length ?? 0,
    top,
  };
}

const WF_FOLDS = 4;
const WF_MIN_SEGMENT_DAYS = 60;

function sliceSet(prices, highs, lows, volumes, dates, from, to) {
  return {
    prices: prices.slice(from, to),
    highs: slice(highs, from, to),
    lows: slice(lows, from, to),
    volumes: volumes.slice(from, to),
    dates: dates.slice(from, to),
  };
}

// Walk-Forward-Validierung: statt eines einzigen 70/30-Splits wird der
// Zeitraum in (folds + 1) Segmente geteilt. Pro Fold trainiert die
// Rastersuche auf allen Segmenten bis einschließlich Fold N (wachsendes
// Fenster, "anchored" – genau wie ein Trader, der mit der Zeit mehr Historie
// zur Verfügung hat) und testet die beste Kombination dann auf dem nächsten,
// noch nie gesehenen Segment. Über alle Folds gemittelt zeigt das, wie gut
// ein "regelmäßig neu optimieren" in der Praxis funktioniert hätte – robuster
// als ein einzelner Split, weil eine zufällig gut getroffene Trainingsphase
// nicht das Gesamtbild verzerren kann.
export function runWalkForward({
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
  costPct = 0.15,
  useBollinger = false,
  useStochRsi = false,
  useObv = false,
  useStrongCandle = false,
  useSma = true,
  useMacd = true,
  useRsi = true,
  useFg = true,
  useMacro = true,
  useVolume = true,
  macroWeight = 2.0,
  signalThreshold = 1.5,
  folds = WF_FOLDS,
}) {
  const n = prices.length;
  const segmentSize = Math.floor(n / (folds + 1));
  if (segmentSize < WF_MIN_SEGMENT_DAYS) {
    throw new Error(`Zeitraum zu kurz für ${folds} Walk-Forward-Folds (mind. ${(folds + 1) * WF_MIN_SEGMENT_DAYS} Tage nötig).`);
  }

  const shared = { macro, fearGreedHistory, fundingRates, stopLossPct, allowShort, leverage, costPct, useBollinger, useStochRsi, useObv, useStrongCandle, useSma, useMacd, useRsi, useFg, useMacro, useVolume, macroWeight, signalThreshold };

  const foldResults = [];
  for (let fold = 1; fold <= folds; fold++) {
    const trainEnd = segmentSize * fold;
    const testEnd = fold === folds ? n : segmentSize * (fold + 1);

    const trainSet = sliceSet(prices, highs, lows, volumes, dates, 0, trainEnd);
    const testSet = sliceSet(prices, highs, lows, volumes, dates, trainEnd, testEnd);

    let best = null;
    for (const [smaFast, smaSlow] of SMA_GRID) {
      for (const [rsiBuyThreshold, rsiSellThreshold] of RSI_GRID) {
        for (const adxThreshold of ADX_GRID) {
          const params = { smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold };
          const trainResult = runBacktest({ ...trainSet, ...shared, ...params });
          const summary = summarize(trainResult);
          if (!best || (summary.sharpe ?? -Infinity) > (best.summary.sharpe ?? -Infinity)) {
            best = { params, summary };
          }
        }
      }
    }

    const testResult = runBacktest({ ...testSet, ...shared, ...best.params });

    foldResults.push({
      fold,
      trainDays: trainSet.prices.length,
      testDays: testSet.prices.length,
      testStart: testSet.dates[0] ? new Date(testSet.dates[0]).toISOString().slice(0, 10) : null,
      testEnd: testSet.dates[testSet.dates.length - 1] ? new Date(testSet.dates[testSet.dates.length - 1]).toISOString().slice(0, 10) : null,
      params: best.params,
      train: best.summary,
      test: summarize(testResult),
    });
  }

  const oosReturns = foldResults.map((f) => f.test.totalReturnPct);
  const oosSharpes = foldResults.map((f) => f.test.sharpe).filter((s) => s != null);
  const avgOosReturnPct = oosReturns.reduce((a, b) => a + b, 0) / oosReturns.length;
  const avgOosSharpe = oosSharpes.length ? oosSharpes.reduce((a, b) => a + b, 0) / oosSharpes.length : null;
  const profitableFolds = foldResults.filter((f) => f.test.totalReturnPct > 0).length;

  return {
    folds: foldResults,
    foldCount: folds,
    avgOosReturnPct,
    avgOosSharpe,
    profitableFolds,
  };
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

function sliceCoin(c, from, to) {
  return {
    coinId: c.coinId,
    symbol: c.symbol,
    fundingRates: c.fundingRates,
    ...sliceSet(c.prices, c.highs, c.lows, c.volumes, c.dates, from, to),
  };
}

// Wie runWalkForward, aber über alle Coins gleichzeitig statt nur einem:
// pro Fold wird die Rastersuche auf dem Trainingsfenster über alle Coins
// gerankt (nach Ø-Sharpe, wie runMultiCoinOptimization), die beste
// Kombination dann auf dem nächsten Testfenster über alle Coins geprüft.
// Kombiniert die beiden bisher stärksten Overfitting-Checks: robuste
// Parameterwahl (mehrere Coins, keine Einzelcoin-Zufälligkeit) UND robuste
// Zeitachse (mehrere Folds statt ein einzelner Split). Coins mit kürzerer
// Historie (z.B. TAO) verkürzen den gemeinsamen Zeitraum wie beim
// Portfolio-Backtest (Ausrichtung vom Ende der Serien her).
//
// coinDatasets: [{ coinId, symbol, prices, highs, lows, volumes, dates, fundingRates }]
export function runMultiCoinWalkForward({
  coinDatasets,
  macro,
  fearGreedHistory,
  stopLossPct = null,
  allowShort = false,
  leverage = 1,
  costPct = 0.15,
  useBollinger = false,
  useStochRsi = false,
  useObv = false,
  useStrongCandle = false,
  useSma = true,
  useMacd = true,
  useRsi = true,
  useFg = true,
  useMacro = true,
  useVolume = true,
  macroWeight = 2.0,
  signalThreshold = 1.5,
  folds = WF_FOLDS,
}) {
  const commonLen = Math.min(...coinDatasets.map((c) => c.prices.length));
  const aligned = coinDatasets.map((c) => sliceCoin(c, c.prices.length - commonLen, c.prices.length));

  const segmentSize = Math.floor(commonLen / (folds + 1));
  if (segmentSize < WF_MIN_SEGMENT_DAYS) {
    throw new Error(`Gemeinsamer Zeitraum zu kurz für ${folds} Walk-Forward-Folds (mind. ${(folds + 1) * WF_MIN_SEGMENT_DAYS} Tage nötig, verfügbar: ${commonLen}).`);
  }

  const shared = { macro, fearGreedHistory, stopLossPct, allowShort, leverage, costPct, useBollinger, useStochRsi, useObv, useStrongCandle, useSma, useMacd, useRsi, useFg, useMacro, useVolume, macroWeight, signalThreshold };

  function runAcrossCoins(sets, params) {
    const perCoin = sets.map((c) => {
      const r = runBacktest({ ...c, ...shared, ...params });
      return { coinId: c.coinId, symbol: c.symbol, ...summarize(r) };
    });
    const sharpes = perCoin.map((p) => p.sharpe).filter((s) => s != null);
    const avgSharpe = avg(sharpes);
    const avgReturnPct = avg(perCoin.map((p) => p.totalReturnPct));
    const positiveCoinCount = perCoin.filter((p) => p.totalReturnPct > 0).length;
    return { avgSharpe, avgReturnPct, positiveCoinCount, totalCoinCount: perCoin.length, perCoin };
  }

  const foldResults = [];
  for (let fold = 1; fold <= folds; fold++) {
    const trainEnd = segmentSize * fold;
    const testEnd = fold === folds ? commonLen : segmentSize * (fold + 1);

    const trainSets = aligned.map((c) => sliceCoin(c, 0, trainEnd));
    const testSets = aligned.map((c) => sliceCoin(c, trainEnd, testEnd));

    let best = null;
    for (const [smaFast, smaSlow] of SMA_GRID) {
      for (const [rsiBuyThreshold, rsiSellThreshold] of RSI_GRID) {
        for (const adxThreshold of ADX_GRID) {
          const params = { smaFast, smaSlow, rsiBuyThreshold, rsiSellThreshold, adxThreshold };
          const train = runAcrossCoins(trainSets, params);
          if (!best || (train.avgSharpe ?? -Infinity) > (best.train.avgSharpe ?? -Infinity)) {
            best = { params, train };
          }
        }
      }
    }

    const test = runAcrossCoins(testSets, best.params);

    foldResults.push({
      fold,
      trainDays: trainEnd,
      testStart: testSets[0].dates[0] ? new Date(testSets[0].dates[0]).toISOString().slice(0, 10) : null,
      testEnd: testSets[0].dates[testSets[0].dates.length - 1] ? new Date(testSets[0].dates[testSets[0].dates.length - 1]).toISOString().slice(0, 10) : null,
      params: best.params,
      train: best.train,
      test,
    });
  }

  const oosReturns = foldResults.map((f) => f.test.avgReturnPct);
  const oosSharpes = foldResults.map((f) => f.test.avgSharpe).filter((s) => s != null);
  const avgOosReturnPct = avg(oosReturns);
  const avgOosSharpe = avg(oosSharpes);
  const profitableFolds = foldResults.filter((f) => f.test.avgReturnPct > 0).length;

  return {
    folds: foldResults,
    foldCount: folds,
    coins: aligned.map((c) => c.symbol),
    days: commonLen,
    avgOosReturnPct,
    avgOosSharpe,
    profitableFolds,
  };
}
