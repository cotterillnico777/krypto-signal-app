// Simuliert die exakt gleiche Signal-Logik wie das Dashboard (lib/signals.js)
// Tag für Tag über eine historische Kursreihe, um zu prüfen, wie die Strategie
// in der Vergangenheit performt hätte. Kein Lookahead: an Tag i fließen nur
// Kurs-/Volumen-/Makro-/FearGreed-Daten bis einschließlich Tag i ein.

import {
  macdSignal,
  volumeSignal,
  smaCrossoverAt,
  computeMacroRegime,
  combineSignal,
  sma,
  computeRSISeries,
  computeMACDSeries,
  computeADXSeries,
  computeBollingerSeries,
  bollingerSignal,
  computeStochRSISeries,
  stochRsiSignal,
  computeOBVSeries,
  obvSignal,
  computeStrongCandleSeries,
} from "./signals";

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
//
// useBollinger/useStochRsi/useObv: steuern einzeln, ob Bollinger/Stochastic
// RSI/On-Balance-Volume in combineSignal einfließen. Default jeweils false –
// ein Walk-Forward-Vergleich (2026-08-08, alle drei einzeln über 3 Zeitfenster
// getestet) zeigte, dass keiner der drei die Out-of-Sample-Rendite/Sharpe
// verbessert, meist im Gegenteil (Bollinger am schädlichsten). Sie werden
// weiterhin berechnet und im Dashboard als Info-Zeilen angezeigt, fließen
// aber standardmäßig nicht mehr ins Kaufen/Verkaufen-Signal ein. true lässt
// sich gezielt für weitere Experimente (andere Gewichte/Schwellenwerte)
// setzen.
//
// costPct: Handelskosten (Fee + Slippage zusammengefasst) je Seite eines
// Trades, als Prozent des Preises. Default 0.15% ≈ Binance-Taker-Fee (0.1%)
// + eine vorsichtige Slippage-Annahme (0.05%) – kein Sonderfall, sondern
// Standard an, weil ein kostenloser Backtest die Realität systematisch zu
// optimistisch darstellt. Wird symmetrisch angewendet: Kaufen (Long-Einstieg
// oder Short-Eindeckung) ist teurer, Verkaufen (Long-Ausstieg oder
// Short-Einstieg) bringt weniger – auch bei Stop-Loss-/Liquidations-Exits,
// die ja ebenfalls echte Orders sind. Der Buy&Hold-Vergleich bekommt
// dieselben Kosten (1x Kauf, 1x Verkauf), sonst wäre der Vergleich unfair.
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
  costPct = 0.15,
  startingCash = STARTING_CASH,
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
}) {
  const equityCurve = [];
  const trades = [];
  let cash = startingCash;
  let direction = null; // "long" | "short" | null
  let entryPrice = null;
  let entryDate = null;
  let marginAtEntry = null;
  let fundingFactor = 1;

  const costFraction = costPct / 100;
  // Kaufen (Long eröffnen / Short eindecken) -> teurer. Verkaufen (Long
  // schließen / Short eröffnen) -> weniger Erlös. Gilt für jede Order,
  // unabhängig davon ob signal-, stop- oder liquidationsgetrieben.
  const buyPrice = (p) => p * (1 + costFraction);
  const sellPrice = (p) => p * (1 - costFraction);

  const buyHoldCoins = startingCash / buyPrice(prices[0]);

  // Alle Indikatoren einmal über die komplette Reihe vorberechnen (O(n))
  // statt sie an jedem Simulationstag auf einem wachsenden Slice neu zu
  // berechnen (O(n²) – bei mehrjährigen Zeiträumen und dem Optimierer mit
  // 80+ Läufen sonst zu langsam/Serverless-Timeout). Kein Lookahead-Risiko:
  // Index i verwendet nur Daten bis einschließlich Tag i, exakt wie vorher.
  const rsiSeries = computeRSISeries(prices);
  const smaFastSeries = sma(prices, smaFast);
  const smaSlowSeries = sma(prices, smaSlow);
  const { macdLine, signalLine } = computeMACDSeries(prices);
  const adxSeries = adxThreshold != null && highs && lows ? computeADXSeries(highs, lows, prices) : null;
  const { percentB: bollPercentB } = computeBollingerSeries(prices);
  const { k: stochRsiK } = computeStochRSISeries(prices);
  const obvSeries = computeOBVSeries(prices, volumes);
  const obvSmaSeries = sma(obvSeries, 20);
  const candleSeries = highs && lows ? computeStrongCandleSeries(highs, lows, prices) : null;

  // Makro-Reihen sind nach Datum sortiert, genau wie die Simulationstage –
  // statt jeden Tag von vorne zu filtern (O(n×m)), zählt je ein Cursor pro
  // Reihe nur vorwärts (O(n+m) über die ganze Simulation).
  let m2Cursor = 0,
    fedfundsCursor = 0,
    dxyCursor = 0,
    yield10yCursor = 0,
    vixCursor = 0;
  const advanceCursor = (series, cursor, dateStr) => {
    while (cursor < series.length && series[cursor].date <= dateStr) cursor++;
    return cursor;
  };

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
    // Long-Einstieg = Kaufen (teurer), Short-Einstieg = Verkaufen (weniger Erlös).
    entryPrice = dir === "long" ? buyPrice(price) : sellPrice(price);
    entryDate = dateStr;
    marginAtEntry = cash;
    fundingFactor = 1;
    cash = 0;
  }

  function closePosition(exitPrice, dateStr, extra = {}) {
    // Long schließen = Verkaufen (weniger Erlös), Short schließen = Kaufen (teurer).
    const adjustedExit = direction === "long" ? sellPrice(exitPrice) : buyPrice(exitPrice);
    const value = positionValueAt(adjustedExit);
    trades.push({
      direction,
      leverage,
      entryDate,
      entryPrice,
      exitDate: dateStr,
      exitPrice: adjustedExit,
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
      const rsi = rsiSeries[i];
      const smaSig = smaCrossoverAt(smaFastSeries, smaSlowSeries, i);
      const macd = { macd: macdLine[i], signal: signalLine[i], prevMacd: macdLine[i - 1], prevSignal: signalLine[i - 1] };
      const macdSig = macdSignal(macd);
      // Nur die letzten 10 Werte werden gebraucht (siehe volumeSignal) – Slice
      // bewusst klein halten statt der ganzen Reihe bis Tag i.
      const volSig = volumeSignal(volumes.slice(Math.max(0, i - 9), i + 1));
      const adx = adxSeries ? adxSeries[i] : null;
      const bollSig = bollingerSignal(bollPercentB[i]);
      const stochRsiSig = stochRsiSignal(stochRsiK[i]);
      const obvSig = obvSignal(obvSeries, obvSmaSeries, i);
      const candleSig = candleSeries ? candleSeries[i] ?? { label: "n/a", dir: 0 } : { label: "n/a", dir: 0 };

      m2Cursor = advanceCursor(macro.m2, m2Cursor, dateStr);
      fedfundsCursor = advanceCursor(macro.fedfunds, fedfundsCursor, dateStr);
      dxyCursor = advanceCursor(macro.dxy, dxyCursor, dateStr);
      yield10yCursor = advanceCursor(macro.yield10y, yield10yCursor, dateStr);
      vixCursor = advanceCursor(macro.vix, vixCursor, dateStr);

      const macroAsOf = computeMacroRegime(macro.m2, macro.fedfunds, macro.dxy, macro.yield10y, macro.vix, {
        m2: m2Cursor,
        fedfunds: fedfundsCursor,
        dxy: dxyCursor,
        yield10y: yield10yCursor,
        vix: vixCursor,
      });
      const fg = closestFearGreed(fearGreedHistory, date);

      combined = combineSignal(smaSig, rsi, macroAsOf, fg, macdSig, volSig, {
        adx,
        adxThreshold,
        rsiBuyThreshold,
        rsiSellThreshold,
        bollSig: useBollinger ? bollSig : null,
        stochRsiSig: useStochRsi ? stochRsiSig : null,
        obvSig: useObv ? obvSig : null,
        candleSig: useStrongCandle ? candleSig : null,
        useSma,
        useMacd,
        useRsi,
        useFg,
        useMacro,
        useVolume,
        macroWeight,
        signalThreshold,
      });
    }

    // Eine laufende Position schließen darf NICHT an cash>0 hängen – cash ist
    // während einer offenen Position immer exakt 0 (das Kapital steckt in der
    // Position), ein Guard hier würde jedes Signal-basierte Schließen
    // blockieren und die Position bis zum Ende/Stop-Loss/Liquidation halten,
    // egal was das Signal danach sagt (echter Bug, gefunden 2026-08-08 beim
    // Untersuchen der durchgängig niedrigen Trade-Anzahl in praktisch jedem
    // Backtest – Ursache war nicht Marktverhalten, sondern dieser Guard).
    // Nur das NEU-Eröffnen einer Position wird weiterhin gegen ein
    // leerliquidiertes Konto (cash <= 0) geschützt, sonst entstünde eine
    // 0/0-Rendite (NaN).
    if (combined.label === "Kaufen" && direction !== "long") {
      if (direction === "short") closePosition(price, dateStr);
      if (cash > 0) openPosition("long", price, dateStr);
    } else if (combined.label === "Verkaufen" && direction !== "short") {
      if (direction === "long") closePosition(price, dateStr);
      if (allowShort && cash > 0) openPosition("short", price, dateStr);
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
  const buyHoldFinal = buyHoldCoins * sellPrice(lastPrice);

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
    startingCash,
    finalEquity,
    totalReturnPct: ((finalEquity - startingCash) / startingCash) * 100,
    buyHoldFinal,
    buyHoldReturnPct: ((buyHoldFinal - startingCash) / startingCash) * 100,
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

// Portfolio-Backtest: verteilt das Startkapital gleichmäßig auf mehrere
// Coins und lässt jeden mit seiner eigenen Signal-Strategie unabhängig
// voneinander handeln (kein Rebalancing zwischen den Coins über die Zeit).
// Im Unterschied zum Multi-Coin-Optimizer, der nur die Einzelergebnisse
// mittelt, wird hier die tatsächliche Summen-Equity-Kurve über alle Coins
// Tag für Tag berechnet – das zeigt einen echten Diversifikationseffekt:
// unkorrelierte Coins können den Portfolio-Drawdown/Sharpe verbessern, auch
// wenn keiner der Coins einzeln die beste Performance liefert.
//
// coinDatasets: [{ coinId, symbol, prices, highs, lows, volumes, dates, fundingRates }]
// Coins mit kürzerer Historie (z.B. neuere Listings) verkürzen automatisch
// den gemeinsamen Betrachtungszeitraum auf die kürzeste verfügbare Historie
// (von den jeweils letzten Tagen aus ausgerichtet, da alle Serien bis "heute"
// reichen) – der tatsächlich genutzte Zeitraum wird als `days` zurückgegeben.
export function runPortfolioBacktest({
  coinDatasets,
  macro,
  fearGreedHistory,
  stopLossPct = null,
  allowShort = false,
  leverage = 1,
  costPct = 0.15,
  smaFast = 10,
  smaSlow = 30,
  rsiBuyThreshold = 30,
  rsiSellThreshold = 70,
  adxThreshold = null,
}) {
  const commonLen = Math.min(...coinDatasets.map((c) => c.prices.length));
  const perCoinCash = STARTING_CASH / coinDatasets.length;

  const perCoin = coinDatasets.map((c) => {
    const from = c.prices.length - commonLen;
    const result = runBacktest({
      prices: c.prices.slice(from),
      highs: c.highs ? c.highs.slice(from) : undefined,
      lows: c.lows ? c.lows.slice(from) : undefined,
      volumes: c.volumes.slice(from),
      dates: c.dates.slice(from),
      macro,
      fearGreedHistory,
      fundingRates: c.fundingRates,
      stopLossPct,
      allowShort,
      leverage,
      costPct,
      smaFast,
      smaSlow,
      rsiBuyThreshold,
      rsiSellThreshold,
      adxThreshold,
      startingCash: perCoinCash,
    });
    return { coinId: c.coinId, symbol: c.symbol, result };
  });

  const dates = perCoin[0].result.equityCurve.map((p) => p.date);
  const equityCurve = dates.map((date, i) => ({
    date,
    equity: perCoin.reduce((sum, c) => sum + c.result.equityCurve[i].equity, 0),
    buyHoldEquity: perCoin.reduce((sum, c) => sum + c.result.equityCurve[i].buyHoldEquity, 0),
  }));

  const startingCash = STARTING_CASH;
  const finalEquity = equityCurve[equityCurve.length - 1].equity;
  const buyHoldFinal = equityCurve[equityCurve.length - 1].buyHoldEquity;

  let peak = -Infinity;
  let maxDrawdown = 0;
  for (const point of equityCurve) {
    peak = Math.max(peak, point.equity);
    maxDrawdown = Math.max(maxDrawdown, ((peak - point.equity) / peak) * 100);
  }

  const { sharpe, sortino } = computeRiskAdjustedRatios(equityCurve);
  const tradeCount = perCoin.reduce((sum, c) => sum + c.result.tradeCount, 0);

  return {
    startingCash,
    finalEquity,
    totalReturnPct: ((finalEquity - startingCash) / startingCash) * 100,
    buyHoldFinal,
    buyHoldReturnPct: ((buyHoldFinal - startingCash) / startingCash) * 100,
    tradeCount,
    maxDrawdown,
    sharpe,
    sortino,
    equityCurve,
    days: commonLen,
    perCoin: perCoin.map((c) => ({
      coinId: c.coinId,
      symbol: c.symbol,
      allocatedCash: perCoinCash,
      totalReturnPct: c.result.totalReturnPct,
      maxDrawdown: c.result.maxDrawdown,
      sharpe: c.result.sharpe,
      sortino: c.result.sortino,
      tradeCount: c.result.tradeCount,
    })),
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
