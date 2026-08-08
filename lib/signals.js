// Zentrale Signal-Logik. Wird sowohl vom Client (pages/index.js) als auch
// serverseitig vom Cron-Job (pages/api/cron/check-signals.js) genutzt, damit
// UI und Push-Benachrichtigungen immer dasselbe Ergebnis berechnen.

export function ema(arr, period) {
  const k = 2 / (period + 1);
  const result = [];
  let prev = arr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result.push(...new Array(period - 1).fill(null), prev);
  for (let i = period; i < arr.length; i++) {
    prev = arr[i] * k + prev * (1 - k);
    result.push(prev);
  }
  return result;
}

// Berechnet MACD-/Signallinie für die komplette Reihe in einem Durchgang
// (O(n)) statt sie bei jedem Aufruf auf einem wachsenden Slice neu zu
// berechnen (O(n²) über einen ganzen Backtest hinweg). signalLine wird aus
// den lückenlosen MACD-Werten gebildet, aber wieder auf die Original-Indizes
// zurückgemappt (validIdx), damit macdLine[i]/signalLine[i] zueinander passen.
export function computeMACDSeries(prices) {
  const n = prices.length;
  if (n < 26) return { macdLine: new Array(n).fill(null), signalLine: new Array(n).fill(null) };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = prices.map((_, i) => (ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null));

  const validIdx = [];
  const validMacd = [];
  macdLine.forEach((v, i) => {
    if (v != null) {
      validIdx.push(i);
      validMacd.push(v);
    }
  });
  const signalValid = ema(validMacd, 9);
  const signalLine = new Array(n).fill(null);
  signalValid.forEach((v, j) => {
    if (v != null) signalLine[validIdx[j]] = v;
  });

  return { macdLine, signalLine };
}

export function computeMACD(prices) {
  if (prices.length < 26) return { macd: null, signal: null, prevMacd: null, prevSignal: null };
  const { macdLine, signalLine } = computeMACDSeries(prices);
  const last = macdLine.length - 1;
  return { macd: macdLine[last], signal: signalLine[last], prevMacd: macdLine[last - 1], prevSignal: signalLine[last - 1] };
}

export function macdSignal(macd) {
  if (!macd.macd || !macd.signal) return { label: "n/a", dir: 0 };
  const crossed = macd.prevMacd <= macd.prevSignal && macd.macd > macd.signal;
  const crossedDown = macd.prevMacd >= macd.prevSignal && macd.macd < macd.signal;
  if (crossed) return { label: "Kaufen (Crossover)", dir: 1 };
  if (crossedDown) return { label: "Verkaufen (Crossover)", dir: -1 };
  return macd.macd > macd.signal ? { label: "Bullish", dir: 0.5 } : { label: "Bearish", dir: -0.5 };
}

export function volumeSignal(volumes) {
  if (!volumes || volumes.length < 10) return { label: "n/a", dir: 0 };
  const avgVol = volumes.slice(-10, -1).reduce((a, b) => a + b, 0) / 9;
  const lastVol = volumes[volumes.length - 1];
  const ratio = lastVol / avgVol;
  if (ratio > 1.5) return { label: `+${((ratio - 1) * 100).toFixed(0)}% vs Ø`, dir: 1 };
  if (ratio < 0.6) return { label: `${((ratio - 1) * 100).toFixed(0)}% vs Ø`, dir: -0.5 };
  return { label: `${((ratio - 1) * 100).toFixed(0)}% vs Ø`, dir: 0 };
}

// Gleitendes Fenster (O(n) statt O(n*period) durch slice+reduce pro Punkt) –
// wichtig, weil der Optimierer diese Funktion über viele Parameter-
// Kombinationen hinweg tausendfach aufruft.
export function sma(arr, period) {
  const result = new Array(arr.length).fill(null);
  let sum = 0;
  for (let i = 0; i < arr.length; i++) {
    sum += arr[i];
    if (i >= period) sum -= arr[i - period];
    if (i >= period - 1) result[i] = sum / period;
  }
  return result;
}

// Volle RSI-Reihe in einem O(n)-Durchgang statt pro Tag im Backtest neu ab
// Index 0 zu rechnen (O(n²) über die gesamte Simulation).
export function computeRSISeries(prices, period = 14) {
  const result = new Array(prices.length).fill(null);
  if (prices.length < period + 1) return result;

  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period,
    avgLoss = losses / period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export function computeRSI(prices, period = 14) {
  const series = computeRSISeries(prices, period);
  return series[series.length - 1];
}

export function rsiLabel(rsi) {
  if (rsi === null) return { text: "n/a", cls: "badge-gray" };
  if (rsi >= 70) return { text: `${rsi.toFixed(0)} – Überkauft`, cls: "badge-red" };
  if (rsi <= 30) return { text: `${rsi.toFixed(0)} – Überverkauft`, cls: "badge-green" };
  return { text: `${rsi.toFixed(0)} – Neutral`, cls: "badge-gray" };
}

// Crossover-Entscheidung aus zwei vorberechneten SMA-Reihen an Index i – vom
// Backtest direkt nutzbar (einmal sma() aufrufen, dann pro Tag nur indizieren)
// statt pro Tag neu zu berechnen.
export function smaCrossoverAt(fastSeries, slowSeries, i) {
  if (i < 1 || fastSeries[i] == null || slowSeries[i] == null || fastSeries[i - 1] == null || slowSeries[i - 1] == null) {
    return { label: "Neutral", dir: 0 };
  }
  const now = fastSeries[i] - slowSeries[i];
  const before = fastSeries[i - 1] - slowSeries[i - 1];
  if (before <= 0 && now > 0) return { label: "Kaufen", dir: 1 };
  if (before >= 0 && now < 0) return { label: "Verkaufen", dir: -1 };
  return { label: now > 0 ? "Halten (bullish)" : "Halten (bearish)", dir: now > 0 ? 0.5 : -0.5 };
}

// Ohne fixedP10/fixedP30 skalieren die Perioden mit der Länge der übergebenen
// Kursreihe (bewusstes Verhalten fürs Dashboard, das je Timeframe unterschiedlich
// lange Kursreihen lädt). Der Backtest übergibt feste Perioden (10/30 Tage),
// damit die Strategie über die gesamte Simulation stabil bleibt.
export function smaSignal(prices, fixedP10, fixedP30) {
  const p10 = fixedP10 ?? Math.min(10, Math.floor(prices.length / 3));
  const p30 = fixedP30 ?? Math.min(30, Math.floor((prices.length * 2) / 3));
  const s10 = sma(prices, p10),
    s30 = sma(prices, p30);
  return smaCrossoverAt(s10, s30, prices.length - 1);
}

// `len` behandelt die Reihe so, als hätte sie nur die ersten `len` Einträge
// (Default: volle Länge) – lässt den Backtest "as of day i" rechnen, ohne
// die Reihe jeden Tag neu zuschneiden/filtern zu müssen (siehe computeMacroRegime).
export function yoyGrowth(series, len = series.length) {
  if (len < 13) return null;
  const last = series[len - 1].value,
    yearAgo = series[len - 13].value;
  return ((last - yearAgo) / yearAgo) * 100;
}

// Änderung zwischen dem letzten Wert und dem Wert vor `lookback` Einträgen
// zurück (z.B. lookback=63 Handelstage ≈ 3 Kalendermonate bei Tagesserien).
export function changeOverLookback(series, lookback, len = series ? series.length : 0) {
  if (!series || len <= lookback) return null;
  const last = series[len - 1].value;
  const prior = series[len - 1 - lookback].value;
  return last - prior;
}

export function pctChangeOverLookback(series, lookback, len = series ? series.length : 0) {
  const change = changeOverLookback(series, lookback, len);
  if (change == null) return null;
  const prior = series[len - 1 - lookback].value;
  return (change / prior) * 100;
}

// Zusammengesetztes Makro-Regime aus fünf Faktoren, jeder normalisiert auf
// einen Score-Beitrag von ungefähr -1 bis +1 (statt Rohwerte unterschiedlicher
// Einheiten/Größenordnungen direkt zu mischen):
// - M2-Geldmengenwachstum (YoY): mehr Liquidität = risk-on
// - Leitzins-Trend (3 Monate): Zinssenkungen = risk-on, Erhöhungen = risk-off
// - Dollar-Index-Trend (3 Monate): schwächerer Dollar = risk-on für Krypto
// - 10J-Rendite-Trend (3 Monate): fallende Renditen = risk-on
// - VIX-Level: erhöhte Angst (>25) = risk-off, Sorglosigkeit (<15) = leicht risk-on
// lens: optionale {m2, fedfunds, dxy, yield10y, vix} Längen-Überschreibungen,
// damit der Backtest die vollen Reihen einmal übergeben kann und pro Tag nur
// einen Cursor weiterzählt statt jeden Tag neu zu filtern/slicen (O(n+m)
// statt O(n×m) über die ganze Simulation – bei mehrjährigen Zeiträumen und
// dem Multi-Coin-Optimizer sonst zu langsam).
export function computeMacroRegime(m2, fedfunds, dxy = [], yield10y = [], vix = [], lens = {}) {
  const m2Len = lens.m2 ?? m2.length;
  const fedfundsLen = lens.fedfunds ?? fedfunds.length;
  const dxyLen = lens.dxy ?? dxy.length;
  const yield10yLen = lens.yield10y ?? yield10y.length;
  const vixLen = lens.vix ?? vix.length;

  const m2Growth = yoyGrowth(m2, m2Len);
  const rateNow = fedfundsLen > 0 ? fedfunds[fedfundsLen - 1]?.value ?? null : null;
  const rate3mo = fedfundsLen >= 4 ? fedfunds[fedfundsLen - 4]?.value ?? null : null;
  const rateTrend = rateNow != null && rate3mo != null ? rateNow - rate3mo : null;
  const dxyTrend = pctChangeOverLookback(dxy, 63, dxyLen);
  const yieldTrend = changeOverLookback(yield10y, 63, yield10yLen);
  const vixLevel = vixLen > 0 ? vix[vixLen - 1].value : null;

  if (m2Growth == null && rateTrend == null) {
    return { label: "Unbekannt", cls: "badge-gray", m2Growth, rateNow, dxyTrend, yieldTrend, vixLevel };
  }

  let score = 0;
  if (m2Growth != null) {
    if (m2Growth > 6) score += 1;
    else if (m2Growth > 3) score += 0.5;
    else if (m2Growth < 0) score -= 1;
    else if (m2Growth < 2) score -= 0.5;
  }
  if (rateTrend != null) {
    if (rateTrend <= -0.25) score += 0.8;
    else if (rateTrend >= 0.25) score -= 0.8;
  }
  if (dxyTrend != null) {
    if (dxyTrend <= -2) score += 0.6;
    else if (dxyTrend >= 2) score -= 0.6;
  }
  if (yieldTrend != null) {
    if (yieldTrend <= -0.3) score += 0.6;
    else if (yieldTrend >= 0.3) score -= 0.6;
  }
  if (vixLevel != null) {
    if (vixLevel >= 25) score -= 0.7;
    else if (vixLevel <= 15) score += 0.3;
  }

  const label = score >= 1.5 ? "Risk-on" : score <= -1.5 ? "Risk-off" : "Neutral";
  const cls = label === "Risk-on" ? "badge-green" : label === "Risk-off" ? "badge-red" : "badge-gray";
  return { label, cls, score, m2Growth, rateNow, rateTrend, dxyTrend, yieldTrend, vixLevel };
}

// Average Directional Index (Wilder). Misst Trendstärke unabhängig von der
// Richtung (0-100, üblich: <20 = kein/schwacher Trend, >25 = starker Trend).
// Braucht High/Low/Close, daher nur dort nutzbar, wo diese Serien vorliegen
// (Backtest/Binance-Klines) – auf dem Dashboard aktuell nicht verdrahtet.
//
// Volle ADX-Reihe in einem O(n)-Durchgang (siehe computeRSISeries/
// computeMACDSeries für die Begründung – ohne das würde der Optimierer bei
// mehrjährigen Zeiträumen in den Server-Timeout laufen). result[i] ist der
// ADX-Wert, der nur Daten bis einschließlich Tag i verwendet (kein Lookahead).
export function computeADXSeries(highs, lows, closes, period = 14) {
  const n = highs ? highs.length : 0;
  const result = new Array(n).fill(null);
  if (n < period * 2 + 1) return result;

  const trs = [], plusDMs = [], minusDMs = [];
  for (let i = 1; i < n; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDMs.push(upMove > downMove && upMove > 0 ? upMove : 0);
    minusDMs.push(downMove > upMove && downMove > 0 ? downMove : 0);
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  // Wilder-Glättung: erster Wert = Summe der ersten `period` Einträge,
  // danach rekursiv (sum - sum/period + neuer Wert).
  const wilderSmooth = (arr) => {
    const out = [arr.slice(0, period).reduce((a, b) => a + b, 0)];
    for (let i = period; i < arr.length; i++) out.push(out[out.length - 1] - out[out.length - 1] / period + arr[i]);
    return out;
  };

  const smoothTR = wilderSmooth(trs);
  const smoothPlusDM = wilderSmooth(plusDMs);
  const smoothMinusDM = wilderSmooth(minusDMs);

  const dxs = smoothTR.map((tr, i) => {
    if (tr === 0) return 0;
    const plusDI = (100 * smoothPlusDM[i]) / tr;
    const minusDI = (100 * smoothMinusDM[i]) / tr;
    const sum = plusDI + minusDI;
    return sum === 0 ? 0 : (100 * Math.abs(plusDI - minusDI)) / sum;
  });

  if (dxs.length < period) return result;

  // Index-Herleitung: trs[k] entspricht Original-Index (k+1) (Loop startet bei
  // i=1). smoothTR[j] fasst trs[0..] bis j=0 -> trs[0..period-1] zusammen,
  // entspricht also Original-Index (period + j). dxs[j] folgt derselben
  // Zuordnung. Der erste ADX-Wert (Mittel von dxs[0..period-1]) liegt daher
  // bei Original-Index (period + (period-1)) = 2*period-1.
  let adx = dxs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let idx = 2 * period - 1;
  if (idx < n) result[idx] = adx;
  for (let i = period; i < dxs.length; i++) {
    adx = (adx * (period - 1) + dxs[i]) / period;
    idx = period + i;
    if (idx < n) result[idx] = adx;
  }
  return result;
}

export function computeADX(highs, lows, closes, period = 14) {
  const series = computeADXSeries(highs, lows, closes, period);
  return series.length ? series[series.length - 1] : null;
}

// opts: { adx, adxThreshold, rsiBuyThreshold = 30, rsiSellThreshold = 70,
// whaleSig }. Alle optional und rückwärtskompatibel – ohne opts verhält sich
// die Funktion exakt wie zuvor. adxThreshold wirkt als Trendfilter: bei
// schwachem Trend (adx < adxThreshold) werden Crossover-Signale
// (Kaufen/Verkaufen) zu "Halten" abgeschwächt statt blind gehandelt zu
// werden. whaleSig kommt aus whaleSignal() (Top-Trader-Positionierung, siehe
// dort) – nur live verfügbar (Binance hält die Daten nur ~30 Tage), Backtest/
// Optimizer/Walk-Forward/Portfolio übergeben sie nie und bleiben dadurch
// unverändert.
export function combineSignal(smaSig, rsi, macro, fg, macdSig, volSig, opts = {}) {
  const { adx = null, adxThreshold = null, rsiBuyThreshold = 30, rsiSellThreshold = 70, whaleSig = null } = opts;

  let score = smaSig.dir * 1.5 + macdSig.dir * 1.5;
  if (rsi !== null) {
    if (rsi <= rsiBuyThreshold) score += 0.8;
    if (rsi >= rsiSellThreshold) score -= 0.8;
  }
  if (fg !== null) {
    if (fg <= 25) score += 0.5;
    if (fg >= 75) score -= 0.5;
  }
  if (macro.label === "Risk-on") score += 0.3;
  if (macro.label === "Risk-off") score -= 0.3;
  score += volSig.dir * 0.4;
  if (whaleSig) score += whaleSig.dir * 0.4;

  let label, cls;
  if (score >= 1.5) { label = "Kaufen"; cls = "badge-green"; }
  else if (score <= -1.5) { label = "Verkaufen"; cls = "badge-red"; }
  else if (score > 0) { label = "Halten (bullish)"; cls = "badge-amber"; }
  else if (score < 0) { label = "Halten (bearish)"; cls = "badge-amber"; }
  else { label = "Neutral"; cls = "badge-gray"; }

  if (adx != null && adxThreshold != null && adx < adxThreshold) {
    if (label === "Kaufen") { label = "Halten (bullish)"; cls = "badge-amber"; }
    else if (label === "Verkaufen") { label = "Halten (bearish)"; cls = "badge-amber"; }
  }

  return { label, cls };
}

// Interpretiert die Long/Short-Positionsratio der Top-Trader (Binance
// Futures, größte Positionen nach Volumen – die kostenlose "Whale"-nächste
// Kennzahl ohne API-Key, siehe fetchWhaleData in lib/marketData.js). Absolute
// Werte sind strukturell coinabhängig verzerrt (Top-Trader liegen auf
// Binance-Perpetuals fast immer netto-long, z.B. TAO meist >2.0, BTC eher
// ~1.5) – ein fester Schwellenwert würde das für jeden Coin unterschiedlich
// interpretieren. Stattdessen wird die heutige Ratio gegen den 7-Tage-
// Durchschnitt derselben Coin verglichen: eine Abweichung vom coin-eigenen
// Normalniveau ist aussagekräftiger als der absolute Level.
export function whaleSignal(history) {
  if (!history || history.length < 2) return { label: "n/a", dir: 0, deviationPct: null };
  const today = history[history.length - 1].ratio;
  const prior = history.slice(0, -1);
  const baseline = prior.reduce((a, b) => a + b.ratio, 0) / prior.length;
  if (!baseline) return { label: "n/a", dir: 0, deviationPct: null };
  const deviationPct = ((today - baseline) / baseline) * 100;
  const sign = deviationPct >= 0 ? "+" : "";
  if (deviationPct >= 8) return { label: `Top-Trader ${sign}${deviationPct.toFixed(0)}% longer als Ø`, dir: 1, deviationPct };
  if (deviationPct <= -8) return { label: `Top-Trader ${deviationPct.toFixed(0)}% weniger long als Ø`, dir: -1, deviationPct };
  return { label: `Top-Trader ${sign}${deviationPct.toFixed(0)}% vs Ø`, dir: 0, deviationPct };
}

// Berechnet für eine Coin-Liste + Makro/FearGreed/Whale-Daten das kombinierte
// Signal je Coin. Genutzt vom Cron-Job, um Kaufsignale zu erkennen.
// whaleData: optional { [coinId]: [{ts, ratio}] } von fetchWhaleData().
export function computeAllSignals(coins, macro, fgValue, whaleData = {}) {
  return coins.map((c) => {
    const rsi = computeRSI(c.prices);
    const smaSig = smaSignal(c.prices);
    const macd = computeMACD(c.prices);
    const macdSig = macdSignal(macd);
    const volSig = volumeSignal(c.volumes);
    const whaleSig = whaleData[c.id] ? whaleSignal(whaleData[c.id]) : null;
    const combined = combineSignal(smaSig, rsi, macro, fgValue, macdSig, volSig, { whaleSig });
    return { coin: c, rsi, smaSig, macdSig, volSig, whaleSig, combined };
  });
}
