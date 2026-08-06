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

export function computeMACD(prices) {
  if (prices.length < 26) return { macd: null, signal: null, prevMacd: null, prevSignal: null };
  const ema12 = ema(prices, 12);
  const ema26 = ema(prices, 26);
  const macdLine = prices.map((_, i) => (ema12[i] != null && ema26[i] != null ? ema12[i] - ema26[i] : null));
  const validMacd = macdLine.filter((v) => v != null);
  const signalLine = ema(validMacd, 9);
  const last = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  return { macd: last, signal: lastSignal, prevMacd: macdLine[macdLine.length - 2], prevSignal: signalLine[signalLine.length - 2] };
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

export function sma(arr, period) {
  return arr.map((_, i) => (i < period - 1 ? null : arr.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period));
}

export function computeRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0,
    losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period,
    avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    avgGain = (avgGain * (period - 1) + (diff > 0 ? diff : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (diff < 0 ? -diff : 0)) / period;
  }
  if (avgLoss === 0) return 100;
  return 100 - 100 / (1 + avgGain / avgLoss);
}

export function rsiLabel(rsi) {
  if (rsi === null) return { text: "n/a", cls: "badge-gray" };
  if (rsi >= 70) return { text: `${rsi.toFixed(0)} – Überkauft`, cls: "badge-red" };
  if (rsi <= 30) return { text: `${rsi.toFixed(0)} – Überverkauft`, cls: "badge-green" };
  return { text: `${rsi.toFixed(0)} – Neutral`, cls: "badge-gray" };
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
  const last = prices.length - 1,
    prev = last - 1;
  if (!s10[last] || !s30[last]) return { label: "Neutral", dir: 0 };
  const now = s10[last] - s30[last],
    before = s10[prev] - s30[prev];
  if (before <= 0 && now > 0) return { label: "Kaufen", dir: 1 };
  if (before >= 0 && now < 0) return { label: "Verkaufen", dir: -1 };
  return { label: now > 0 ? "Halten (bullish)" : "Halten (bearish)", dir: now > 0 ? 0.5 : -0.5 };
}

export function yoyGrowth(series) {
  if (series.length < 13) return null;
  const last = series[series.length - 1].value,
    yearAgo = series[series.length - 13].value;
  return ((last - yearAgo) / yearAgo) * 100;
}

export function computeMacroRegime(m2, fedfunds) {
  const m2Growth = yoyGrowth(m2);
  const rateNow = fedfunds[fedfunds.length - 1]?.value;
  const rate3mo = fedfunds[fedfunds.length - 4]?.value;
  if (m2Growth == null || rateNow == null || rate3mo == null) return { label: "Unbekannt", cls: "badge-gray", m2Growth, rateNow };
  const score = m2Growth - (rateNow - rate3mo) * 2;
  if (score > 1) return { label: "Risk-on", cls: "badge-green", m2Growth, rateNow };
  if (score < -1) return { label: "Risk-off", cls: "badge-red", m2Growth, rateNow };
  return { label: "Neutral", cls: "badge-gray", m2Growth, rateNow };
}

export function combineSignal(smaSig, rsi, macro, fg, macdSig, volSig) {
  let score = smaSig.dir * 1.5 + macdSig.dir * 1.5;
  if (rsi !== null) {
    if (rsi <= 30) score += 0.8;
    if (rsi >= 70) score -= 0.8;
  }
  if (fg !== null) {
    if (fg <= 25) score += 0.5;
    if (fg >= 75) score -= 0.5;
  }
  if (macro.label === "Risk-on") score += 0.3;
  if (macro.label === "Risk-off") score -= 0.3;
  score += volSig.dir * 0.4;
  if (score >= 1.5) return { label: "Kaufen", cls: "badge-green" };
  if (score <= -1.5) return { label: "Verkaufen", cls: "badge-red" };
  if (score > 0) return { label: "Halten (bullish)", cls: "badge-amber" };
  if (score < 0) return { label: "Halten (bearish)", cls: "badge-amber" };
  return { label: "Neutral", cls: "badge-gray" };
}

// Berechnet für eine Coin-Liste + Makro/FearGreed-Daten das kombinierte
// Signal je Coin. Genutzt vom Cron-Job, um Kaufsignale zu erkennen.
export function computeAllSignals(coins, macro, fgValue) {
  return coins.map((c) => {
    const rsi = computeRSI(c.prices);
    const smaSig = smaSignal(c.prices);
    const macd = computeMACD(c.prices);
    const macdSig = macdSignal(macd);
    const volSig = volumeSignal(c.volumes);
    const combined = combineSignal(smaSig, rsi, macro, fgValue, macdSig, volSig);
    return { coin: c, rsi, smaSig, macdSig, volSig, combined };
  });
}
