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
// - M2-Geldmengenwachstum (YoY): mehr Liquidität = risk-off (siehe unten)
// - Leitzins-Trend (3 Monate): Zinssenkungen = risk-on, Erhöhungen = risk-off
// - Dollar-Index-Trend (3 Monate): schwächerer Dollar = risk-on für Krypto
// - 10J-Rendite-Trend (3 Monate): fallende Renditen = risk-on
// - VIX-Level: erhöhte Angst (>25) = risk-on, Sorglosigkeit (<15) = leicht risk-off (siehe unten)
//
// M2 und VIX wurden am 08.08.2026 umgedreht: eine Analyse der 14-Tage-
// Vorwärtsrendite von BTC gegen die historischen Faktor-Ausprägungen zeigte,
// dass hohe M2-Liquidität und ruhige Märkte (VIX niedrig) – ursprünglich als
// bullish gewertet – historisch schlechter abschnitten als niedriges
// M2-Wachstum bzw. Angst-Phasen (VIX hoch). Mögliche Erklärung: hohe
// M2-Liquidität/Sorglosigkeit fällt eher mit späten Bullenmarkt-Phasen
// zusammen (wenig Aufwärtspotenzial mehr), während Angst-Phasen/VIX-Spitzen
// oft nahe lokalen Tiefs liegen ("sei gierig, wenn andere ängstlich sind").
// Dollar-Index- und 10J-Renditen-Trend zeigten dagegen die erwartete
// Richtung und blieben unverändert. Basis: nur ~2,7 Jahre Historie mit stark
// überlappenden 14-Tage-Fenstern (~70 unabhängige Perioden) – Richtung
// plausibel, aber keine große Stichprobe; bei Gelegenheit mit mehr Historie
// erneut prüfen.
// nasdaqTrend (90 Handelstage) am 09.08.2026 ergänzt: eine Pearson-
// Korrelationsstudie (BTC-Forward-14-Tage-Rendite gegen den 90-Tage-Trend,
// n≈2050 Handelstage 2018-2026) zeigte eine schwache, aber konsistent
// positive Korrelation (r≈0.10 bei 90 Tagen, r zwischen 0.04-0.09 bei
// 21-126 Tagen Lookback) – steigender Nasdaq-Trend geht tendenziell mit
// besserer BTC-Forward-Rendite einher. S&P 500 zeigte in derselben Studie
// eine deutlich schwächere/uneinheitlichere Korrelation (r nahe 0 bei
// kurzen Lookbacks) und fließt daher NICHT in den Score ein – wird aber
// weiterhin berechnet und zurückgegeben (Dashboard-Anzeige/Debug).
// Ein Multi-Coin-Walk-Forward-Vergleich mit/ohne Nasdaq-Score-Beitrag
// (09.08.2026, 365/730/850 Tage) zeigte aber KEINEN robusten Vorteil: 365d
// identisch, 730d klar besser OHNE (Sharpe -0.16 vs -0.29), 850d etwas
// besser MIT (Sharpe 0.18 vs 0.14) – uneinheitlich über die Fenster, anders
// als z.B. macroWeight, wo alle drei Fenster in dieselbe Richtung zeigten.
// Gleiche Behandlung wie Bollinger/StochRSI/OBV (siehe combineSignal-
// Kommentar): der Score-Beitrag bleibt standardmäßig AUS, obwohl die reine
// Korrelationsstudie vielversprechend aussah – r≈0.10 war offenbar zu
// schwach, um sich im Schwellenwert-Score der tatsächlichen Handelsstrategie
// niederzuschlagen.
//
// lens: optionale {m2, fedfunds, dxy, yield10y, vix, sp500, nasdaq}
// Längen-Überschreibungen, damit der Backtest die vollen Reihen einmal
// übergeben kann und pro Tag nur einen Cursor weiterzählt statt jeden Tag
// neu zu filtern/slicen (O(n+m) statt O(n×m) über die ganze Simulation –
// bei mehrjährigen Zeiträumen und dem Multi-Coin-Optimizer sonst zu langsam).
//
// opts.useNasdaq (Default false): schaltet den Nasdaq-Trend-Beitrag zum
// Score isoliert an, für weitere Experimente (siehe runBacktest). nasdaqTrend
// wird unabhängig davon immer berechnet/zurückgegeben (Dashboard-Anzeige).
// opts.useSp500 (Default false, ergänzt 16.08.2026): symmetrisches Gegenstück
// für den S&P-500-Trend-Beitrag -- sp500Trend wurde bisher nur berechnet/
// angezeigt, hatte aber (anders als Nasdaq) noch nie einen eigenen
// Score-Opt-in zum gezielten Testen. Gleiche Schwellenwerte/Gewichtung wie
// beim Nasdaq-Zweig, damit beide direkt vergleichbar sind.
export function computeMacroRegime(m2, fedfunds, dxy = [], yield10y = [], vix = [], sp500 = [], nasdaq = [], lens = {}, opts = {}) {
  const { useNasdaq = false, useSp500 = false } = opts;
  const m2Len = lens.m2 ?? m2.length;
  const fedfundsLen = lens.fedfunds ?? fedfunds.length;
  const dxyLen = lens.dxy ?? dxy.length;
  const yield10yLen = lens.yield10y ?? yield10y.length;
  const vixLen = lens.vix ?? vix.length;
  const sp500Len = lens.sp500 ?? sp500.length;
  const nasdaqLen = lens.nasdaq ?? nasdaq.length;

  const m2Growth = yoyGrowth(m2, m2Len);
  const rateNow = fedfundsLen > 0 ? fedfunds[fedfundsLen - 1]?.value ?? null : null;
  const rate3mo = fedfundsLen >= 4 ? fedfunds[fedfundsLen - 4]?.value ?? null : null;
  const rateTrend = rateNow != null && rate3mo != null ? rateNow - rate3mo : null;
  const dxyTrend = pctChangeOverLookback(dxy, 63, dxyLen);
  const yieldTrend = changeOverLookback(yield10y, 63, yield10yLen);
  const vixLevel = vixLen > 0 ? vix[vixLen - 1].value : null;
  const sp500Trend = pctChangeOverLookback(sp500, 63, sp500Len);
  const nasdaqTrend = pctChangeOverLookback(nasdaq, 90, nasdaqLen);

  if (m2Growth == null && rateTrend == null) {
    return { label: "Unbekannt", cls: "badge-gray", m2Growth, rateNow, dxyTrend, yieldTrend, vixLevel, sp500Trend, nasdaqTrend };
  }

  let score = 0;
  if (m2Growth != null) {
    if (m2Growth > 6) score -= 1;
    else if (m2Growth > 3) score -= 0.5;
    else if (m2Growth < 0) score += 1;
    else if (m2Growth < 2) score += 0.5;
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
    if (vixLevel >= 25) score += 0.7;
    else if (vixLevel <= 15) score -= 0.3;
  }
  if (useNasdaq && nasdaqTrend != null) {
    if (nasdaqTrend >= 5) score += 0.5;
    else if (nasdaqTrend <= -5) score -= 0.5;
  }
  if (useSp500 && sp500Trend != null) {
    if (sp500Trend >= 5) score += 0.5;
    else if (sp500Trend <= -5) score -= 0.5;
  }

  const label = score >= 1.5 ? "Risk-on" : score <= -1.5 ? "Risk-off" : "Neutral";
  const cls = label === "Risk-on" ? "badge-green" : label === "Risk-off" ? "badge-red" : "badge-gray";
  return { label, cls, score, m2Growth, rateNow, rateTrend, dxyTrend, yieldTrend, vixLevel, sp500Trend, nasdaqTrend };
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

// Average True Range (Wilder-Glättung, gleiches Muster wie computeADXSeries'
// interne TR-Glättung, hier aber als eigene wiederverwendbare Reihe statt nur
// Zwischenschritt). Misst die "normale" Tagesspanne – Grundlage, um zu
// erkennen, wann ein Tag ungewöhnlich groß ausschlägt (siehe
// computeStrongCandleSeries).
export function computeATRSeries(highs, lows, closes, period = 14) {
  const n = highs ? highs.length : 0;
  const result = new Array(n).fill(null);
  if (n < period + 1) return result;

  const trs = [];
  for (let i = 1; i < n; i++) {
    trs.push(Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i - 1]), Math.abs(lows[i] - closes[i - 1])));
  }

  // Wilder: erster ATR-Wert = einfacher Mittelwert der ersten `period` TRs,
  // danach rekursiv geglättet. trs[k] entspricht Original-Index (k+1).
  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let idx = period; // trs[period-1] -> Original-Index period
  if (idx < n) result[idx] = atr;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
    idx = i + 1;
    if (idx < n) result[idx] = atr;
  }
  return result;
}

// "Starke Kerze": ein Tag mit ungewöhnlich großer Handelsspanne (High-Low)
// relativ zur zuletzt üblichen Spanne (ATR), der zudem klar in eine Richtung
// geschlossen hat (Close nahe Hoch oder Tief statt mittig in der Spanne) –
// eine Annäherung an ein Marubozu-artiges "starke Kerze"-Muster ohne
// Eröffnungskurs (den liefert Binance zwar auch, wird hier aber bewusst
// nicht gebraucht: Spannbreite + Schlusskurs-Position reichen für die
// Kernaussage "ungewöhnlich impulsiver, eindeutig gerichteter Tag").
// Nutzt bewusst den ATR von GESTERN (atrSeries[i-1]) als Vergleichsbasis,
// nicht den von heute – sonst würde der heutige Ausreißer-Tag seinen eigenen
// Vergleichsmaßstab mit verzerren (Lookahead-artiges Selbstbezugsproblem).
export function computeStrongCandleSeries(highs, lows, closes, opts = {}) {
  const { period = 14, rangeMult = 1.8, closePosThreshold = 0.7 } = opts;
  const atrSeries = computeATRSeries(highs, lows, closes, period);
  const n = highs.length;
  const result = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    const atrPrior = atrSeries[i - 1];
    if (atrPrior == null || atrPrior === 0) continue;
    const range = highs[i] - lows[i];
    if (range < rangeMult * atrPrior) {
      result[i] = { label: "Neutral", dir: 0 };
      continue;
    }
    const closePos = range > 0 ? (closes[i] - lows[i]) / range : 0.5;
    if (closePos >= closePosThreshold) result[i] = { label: "Kaufen", dir: 1 };
    else if (closePos <= 1 - closePosThreshold) result[i] = { label: "Verkaufen", dir: -1 };
    else result[i] = { label: "Neutral", dir: 0 };
  }
  return result;
}

export function strongCandleSignal(highs, lows, closes, opts = {}) {
  const series = computeStrongCandleSeries(highs, lows, closes, opts);
  const last = series[series.length - 1];
  return last ?? { label: "n/a", dir: 0 };
}

// Marubozu: eine Kerze, deren Körper (|Close - Open|) fast die komplette
// Tagesspanne ausmacht – also (fast) keine Dochte, im Unterschied zu
// computeStrongCandleSeries, das nur Spannbreite + Schlusskurs-Position
// nutzt (kein Docht-Konzept ohne Eröffnungskurs möglich). Klassisches
// "durchgängig eine Richtung, ohne Gegenwehr"-Muster: bullisch, wenn Close >
// Open UND kaum Dochte, bearish umgekehrt. bodyRatioThreshold = 0.9 bedeutet
// Körper macht mindestens 90% der Spanne aus (die restlichen ≤10% verteilen
// sich auf beide Dochte zusammen).
export function computeMarubozuSeries(opens, highs, lows, closes, opts = {}) {
  const { bodyRatioThreshold = 0.9 } = opts;
  const n = opens.length;
  const result = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const range = highs[i] - lows[i];
    if (range <= 0) {
      result[i] = { label: "Neutral", dir: 0 };
      continue;
    }
    const bodyRatio = Math.abs(closes[i] - opens[i]) / range;
    if (bodyRatio < bodyRatioThreshold) {
      result[i] = { label: "Neutral", dir: 0 };
    } else if (closes[i] > opens[i]) {
      result[i] = { label: "Kaufen", dir: 1 };
    } else if (closes[i] < opens[i]) {
      result[i] = { label: "Verkaufen", dir: -1 };
    } else {
      result[i] = { label: "Neutral", dir: 0 };
    }
  }
  return result;
}

export function marubozuSignal(opens, highs, lows, closes, opts = {}) {
  const series = computeMarubozuSeries(opens, highs, lows, closes, opts);
  const last = series[series.length - 1];
  return last ?? { label: "n/a", dir: 0 };
}

// Bollinger Bänder: Mittelband = SMA(period), oberes/unteres Band = Mittelband
// ± mult Standardabweichungen. %B = Position des Kurses im Band (0 = am
// unteren Band, 1 = am oberen Band, <0/>1 = außerhalb) – die eigentliche
// Signal-Größe, robuster als die absoluten Bandwerte selbst.
// O(n) über eine gleitende Summe + Summe der Quadrate statt pro Tag neu über
// das Fenster zu iterieren (gleiches Muster wie sma()).
export function computeBollingerSeries(prices, period = 20, mult = 2) {
  const n = prices.length;
  const middle = new Array(n).fill(null);
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  const percentB = new Array(n).fill(null);
  let sum = 0,
    sumSq = 0;
  for (let i = 0; i < n; i++) {
    sum += prices[i];
    sumSq += prices[i] * prices[i];
    if (i >= period) {
      sum -= prices[i - period];
      sumSq -= prices[i - period] * prices[i - period];
    }
    if (i >= period - 1) {
      const mean = sum / period;
      const variance = Math.max(sumSq / period - mean * mean, 0); // Floating-Point-Rauschen kann leicht negativ werden
      const stdDev = Math.sqrt(variance);
      middle[i] = mean;
      upper[i] = mean + mult * stdDev;
      lower[i] = mean - mult * stdDev;
      const range = upper[i] - lower[i];
      percentB[i] = range > 0 ? (prices[i] - lower[i]) / range : 0.5;
    }
  }
  return { middle, upper, lower, percentB };
}

export function computeBollinger(prices, period = 20, mult = 2) {
  const s = computeBollingerSeries(prices, period, mult);
  const last = s.percentB.length - 1;
  return { percentB: s.percentB[last], upper: s.upper[last], lower: s.lower[last], middle: s.middle[last] };
}

export function bollingerSignal(percentB) {
  if (percentB == null) return { label: "n/a", dir: 0 };
  if (percentB <= 0) return { label: "Unteres Band (überverkauft)", dir: 1 };
  if (percentB >= 1) return { label: "Oberes Band (überkauft)", dir: -1 };
  if (percentB < 0.2) return { label: "Nahe unterem Band", dir: 0.5 };
  if (percentB > 0.8) return { label: "Nahe oberem Band", dir: -0.5 };
  return { label: "Mittelband-Bereich", dir: 0 };
}

// Gleitender Durchschnitt, der Lücken (null) am Anfang der Reihe überspringt
// statt sie als 0 zu werten – für Stochastic RSI gebraucht, wo %K/%D erst ab
// einem bestimmten Index Werte haben (im Unterschied zu sma(), das von einer
// durchgehend gefüllten Reihe ausgeht, z.B. Kursen).
function rollingMeanSkipNulls(arr, period) {
  const n = arr.length;
  const result = new Array(n).fill(null);
  let sum = 0,
    validCount = 0;
  const buf = [];
  for (let i = 0; i < n; i++) {
    const v = arr[i];
    buf.push(v);
    if (v != null) {
      sum += v;
      validCount++;
    }
    if (buf.length > period) {
      const removed = buf.shift();
      if (removed != null) {
        sum -= removed;
        validCount--;
      }
    }
    if (buf.length === period && validCount === period) result[i] = sum / period;
  }
  return result;
}

// Stochastic RSI: normiert die RSI-Reihe selbst auf ihr eigenes Hoch/Tief der
// letzten stochPeriod Tage (0-100), dadurch empfindlicher/schneller als
// reines RSI. %K = geglättetes rohes StochRSI, %D = geglättetes %K
// (klassische 14/14/3/3-Konfiguration). Fensterbreite ist konstant (14), die
// innere Min/Max-Suche bleibt damit O(n) über die gesamte Reihe, nicht O(n²).
export function computeStochRSISeries(prices, rsiPeriod = 14, stochPeriod = 14, kSmooth = 3, dSmooth = 3) {
  const rsiSeries = computeRSISeries(prices, rsiPeriod);
  const n = prices.length;
  const rawK = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    if (rsiSeries[i] == null) continue;
    const windowStart = i - stochPeriod + 1;
    if (windowStart < 0) continue;
    let minRsi = Infinity,
      maxRsi = -Infinity,
      valid = true;
    for (let j = windowStart; j <= i; j++) {
      if (rsiSeries[j] == null) {
        valid = false;
        break;
      }
      if (rsiSeries[j] < minRsi) minRsi = rsiSeries[j];
      if (rsiSeries[j] > maxRsi) maxRsi = rsiSeries[j];
    }
    if (!valid) continue;
    const range = maxRsi - minRsi;
    rawK[i] = range > 0 ? ((rsiSeries[i] - minRsi) / range) * 100 : 50;
  }
  const k = rollingMeanSkipNulls(rawK, kSmooth);
  const d = rollingMeanSkipNulls(k, dSmooth);
  return { k, d };
}

export function computeStochRSI(prices) {
  const s = computeStochRSISeries(prices);
  const last = s.k.length - 1;
  return { k: s.k[last], d: s.d[last] };
}

export function stochRsiSignal(k) {
  if (k == null) return { label: "n/a", dir: 0 };
  if (k <= 20) return { label: `${k.toFixed(0)} – Überverkauft`, dir: 1 };
  if (k >= 80) return { label: `${k.toFixed(0)} – Überkauft`, dir: -1 };
  return { label: `${k.toFixed(0)} – Neutral`, dir: 0 };
}

// On-Balance-Volume: kumuliertes Volumen, das bei steigendem Kurs addiert und
// bei fallendem Kurs subtrahiert wird – zeigt, ob Volumen eine Kursbewegung
// stützt (OBV bewegt sich mit dem Kurs) oder ihr widerspricht (Divergenz).
// Signal via Crossover gegen die eigene SMA(20) (Akkumulation/Distribution),
// nutzt dafür direkt smaCrossoverAt wieder statt eigene Crossover-Logik.
export function computeOBVSeries(prices, volumes) {
  const n = prices.length;
  const obv = new Array(n).fill(0);
  for (let i = 1; i < n; i++) {
    if (prices[i] > prices[i - 1]) obv[i] = obv[i - 1] + volumes[i];
    else if (prices[i] < prices[i - 1]) obv[i] = obv[i - 1] - volumes[i];
    else obv[i] = obv[i - 1];
  }
  return obv;
}

const OBV_LABELS = {
  Kaufen: "Akkumulation",
  Verkaufen: "Distribution",
  "Halten (bullish)": "Akkumulation (schwach)",
  "Halten (bearish)": "Distribution (schwach)",
  Neutral: "Neutral",
};

export function obvSignal(obvSeries, obvSmaSeries, i) {
  const cross = smaCrossoverAt(obvSeries, obvSmaSeries, i);
  return { label: OBV_LABELS[cross.label] ?? cross.label, dir: cross.dir };
}

export function computeOBVSignal(prices, volumes) {
  const obv = computeOBVSeries(prices, volumes);
  const obvSma = sma(obv, 20);
  return obvSignal(obv, obvSma, obv.length - 1);
}

// opts: { adx, adxThreshold, rsiBuyThreshold = 30, rsiSellThreshold = 70,
// whaleSig, bollSig, stochRsiSig, obvSig, candleSig, useSma, useMacd, useRsi,
// useFg, useMacro, useVolume }. Alle optional und rückwärtskompatibel – ohne opts
// verhält sich die Funktion exakt wie zuvor. adxThreshold wirkt als
// Trendfilter: bei schwachem Trend (adx < adxThreshold) werden Crossover-
// Signale (Kaufen/Verkaufen) zu "Halten" abgeschwächt statt blind gehandelt
// zu werden. whaleSig kommt aus whaleSignal() (Top-Trader-Positionierung,
// siehe dort) – nur live verfügbar (Binance hält die Daten nur ~30 Tage),
// Backtest/Optimizer/Walk-Forward/Portfolio übergeben sie nie und bleiben
// dadurch unverändert. bollSig/stochRsiSig/obvSig (Bollinger Bänder,
// Stochastic RSI, On-Balance-Volume) sind voll historisch verfügbar, werden
// aber standardmäßig NICHT übergeben (weder vom Dashboard/Cron noch von
// runBacktest) – ein Walk-Forward-Vergleich (2026-08-08, alle drei einzeln
// über 3 Zeitfenster) zeigte, dass keiner davon die Out-of-Sample-Rendite/
// Sharpe verbessert. Bleiben als Parameter nutzbar für gezielte Experimente
// (siehe runBacktest useBollinger/useStochRsi/useObv).
//
// useSma/useMacd/useRsi/useFg/useMacro/useVolume: schalten die sechs
// ursprünglichen Signal-Bestandteile einzeln ab (Default jeweils true = wie
// bisher) – für denselben Isolationstest wie bei den drei neuen
// Indikatoren, nur auf die von Anfang an vorhandenen Signale angewendet.
//
// signalThreshold (Default 1.5): Score-Schwelle für Kaufen/Verkaufen. Bei der
// Standard-Konfiguration reicht praktisch immer nur ein SMA- oder MACD-
// Crossover allein, um sie zu erreichen – Sekundärsignale (RSI/FG/Makro/
// Volumen) können sie so gut wie nie kippen, weil es über Monate/Jahre oft
// nur eine Handvoll Crossover-Tage gibt (siehe Walk-Forward-Analyse
// 2026-08-08: 1 Trade pro Fold trotz schnellerem SMA-Paar). Eine niedrigere
// Schwelle lässt auch schwächere, von mehreren Sekundärsignalen getragene
// Kombinationen auslösen – mehr Handelsfrequenz, aber auch mehr Rauschen.
export function combineSignal(smaSig, rsi, macro, fg, macdSig, volSig, opts = {}) {
  const {
    adx = null,
    adxThreshold = null,
    rsiBuyThreshold = 30,
    rsiSellThreshold = 70,
    whaleSig = null,
    bollSig = null,
    stochRsiSig = null,
    obvSig = null,
    candleSig = null,
    marubozuSig = null,
    superTrendSig = null,
    donchianSig = null,
    useSma = true,
    useMacd = true,
    useRsi = true,
    useFg = true,
    useMacro = true,
    useVolume = true,
    macroWeight = 2.0,
    signalThreshold = 1.5,
  } = opts;

  let score = 0;
  if (useSma) score += smaSig.dir * 1.5;
  if (useMacd) score += macdSig.dir * 1.5;
  if (useRsi && rsi !== null) {
    if (rsi <= rsiBuyThreshold) score += 0.8;
    if (rsi >= rsiSellThreshold) score -= 0.8;
  }
  if (useFg && fg !== null) {
    if (fg <= 25) score += 0.5;
    if (fg >= 75) score -= 0.5;
  }
  if (useMacro) {
    if (macro.label === "Risk-on") score += macroWeight;
    if (macro.label === "Risk-off") score -= macroWeight;
  }
  if (useVolume) score += volSig.dir * 0.4;
  if (whaleSig) score += whaleSig.dir * 0.4;
  if (bollSig) score += bollSig.dir * 0.5;
  if (stochRsiSig) score += stochRsiSig.dir * 0.6;
  if (obvSig) score += obvSig.dir * 0.5;
  if (candleSig) score += candleSig.dir * 0.5;
  if (marubozuSig) score += marubozuSig.dir * 0.5;
  if (superTrendSig) score += superTrendSig.dir * 0.5;
  if (donchianSig) score += donchianSig.dir * 0.5;

  let label, cls;
  if (score >= signalThreshold) { label = "Kaufen"; cls = "badge-green"; }
  else if (score <= -signalThreshold) { label = "Verkaufen"; cls = "badge-red"; }
  else if (score > 0) { label = "Halten (bullish)"; cls = "badge-amber"; }
  else if (score < 0) { label = "Halten (bearish)"; cls = "badge-amber"; }
  else { label = "Neutral"; cls = "badge-gray"; }

  if (adx != null && adxThreshold != null && adx < adxThreshold) {
    if (label === "Kaufen") { label = "Halten (bullish)"; cls = "badge-amber"; }
    else if (label === "Verkaufen") { label = "Halten (bearish)"; cls = "badge-amber"; }
  }

  return { label, cls };
}

// Übersetzt die Faktoren, die in combineSignal() in den Score einfließen, in
// einen kurzen Klartext-Satz -- Pull-Faktor für Neuling-/Retail-Investoren,
// die nicht wissen, was RSI/MACD/"Makro-Regime" bedeuten, aber trotzdem
// nachvollziehen wollen, WARUM die App gerade "Kaufen" oder "Verkaufen"
// anzeigt (statt es als Black Box hinzunehmen). Reine Anzeige-Funktion --
// verändert combineSignal() selbst nicht, das bleibt alleinige Quelle für
// den tatsächlichen Score.
// lang (Default "de"): rein Anzeige-Sprache für den zurückgegebenen Satz --
// der einzige Aufrufer ist pages/index.js (client-seitig, ans DE/EN-
// Sprachumschalter aus lib/i18n.js gekoppelt), daher hier sicher optional
// erweiterbar statt über eine separate Übersetzungs-Ebene nachzubilden.
export function explainSignal({ label, smaSig, rsi, macdSig, volSig, macro, fg, whaleSig, rsiBuyThreshold = 30, rsiSellThreshold = 70, macroWeight = 2.0, lang = "de" }) {
  const en = lang === "en";
  const bullish = label === "Kaufen" || label === "Halten (bullish)";
  const bearish = label === "Verkaufen" || label === "Halten (bearish)";
  if (!bullish && !bearish) {
    return en
      ? "The signals are currently mixed or neutral -- no clear tendency visible."
      : "Die Signale sind aktuell gemischt bzw. neutral -- keine klare Tendenz erkennbar.";
  }
  const wantDir = bullish ? 1 : -1;

  const factors = [];
  if (smaSig && smaSig.dir !== 0) {
    factors.push({
      weight: Math.abs(smaSig.dir) * 1.5,
      dir: Math.sign(smaSig.dir),
      text: smaSig.dir > 0
        ? (en ? "the short-term price trend is above the long-term one (positive)" : "der kurzfristige Kurstrend über dem langfristigen liegt (positiv)")
        : (en ? "the short-term price trend is below the long-term one (negative)" : "der kurzfristige Kurstrend unter dem langfristigen liegt (negativ)"),
    });
  }
  if (macdSig && macdSig.dir !== 0) {
    factors.push({
      weight: Math.abs(macdSig.dir) * 1.5,
      dir: Math.sign(macdSig.dir),
      text: macdSig.dir > 0
        ? (en ? "MACD momentum is positive" : "das MACD-Momentum positiv ist")
        : (en ? "MACD momentum is negative" : "das MACD-Momentum negativ ist"),
    });
  }
  if (rsi != null) {
    if (rsi <= rsiBuyThreshold) factors.push({ weight: 0.8, dir: 1, text: en ? "the RSI is oversold (possible recovery)" : "der RSI überverkauft ist (mögliche Erholung)" });
    if (rsi >= rsiSellThreshold) factors.push({ weight: 0.8, dir: -1, text: en ? "the RSI is overbought (possible correction)" : "der RSI überkauft ist (mögliche Korrektur)" });
  }
  if (fg != null) {
    if (fg <= 25) factors.push({ weight: 0.5, dir: 1, text: en ? "the Fear & Greed Index shows extreme fear (historically often a buy signal)" : "der Fear-&-Greed-Index extreme Angst zeigt (historisch oft ein Kaufsignal)" });
    if (fg >= 75) factors.push({ weight: 0.5, dir: -1, text: en ? "the Fear & Greed Index shows extreme greed (historically often a warning sign)" : "der Fear-&-Greed-Index extreme Gier zeigt (historisch oft ein Warnsignal)" });
  }
  if (macro) {
    if (macro.label === "Risk-on") factors.push({ weight: macroWeight, dir: 1, text: en ? "the macroeconomic environment is favorable (risk-on)" : "das gesamtwirtschaftliche Umfeld günstig ist (Risk-on)" });
    if (macro.label === "Risk-off") factors.push({ weight: macroWeight, dir: -1, text: en ? "the macroeconomic environment is unfavorable (risk-off)" : "das gesamtwirtschaftliche Umfeld ungünstig ist (Risk-off)" });
  }
  if (volSig && volSig.dir > 0) {
    factors.push({ weight: volSig.dir * 0.4, dir: 1, text: en ? "trading volume is significantly elevated" : "das Handelsvolumen deutlich erhöht ist" });
  }
  if (whaleSig && whaleSig.dir !== 0) {
    factors.push({
      weight: 0.4,
      dir: whaleSig.dir,
      text: whaleSig.dir > 0
        ? (en ? "large traders are more long-positioned than usual" : "große Trader stärker long positioniert sind als sonst")
        : (en ? "large traders are more short-positioned than usual" : "große Trader stärker short positioniert sind als sonst"),
    });
  }

  const aligned = factors.filter((f) => f.dir === wantDir).sort((a, b) => b.weight - a.weight);
  if (aligned.length === 0) {
    return en
      ? "The individual factors are closely balanced against each other -- no dominant reason visible."
      : "Die Einzelfaktoren stehen knapp gegeneinander -- keine dominante Begründung erkennbar.";
  }
  const top = aligned.slice(0, 2).map((f) => f.text);
  const joined = top.length === 2 ? `${top[0]} ${en ? "and" : "und"} ${top[1]}` : top[0];
  return en ? `Mainly because ${joined}.` : `Vor allem, weil ${joined}.`;
}

// Reine Anzeige-Formatierung für die Geld-Brief-Spanne (siehe fetchOrderBookData
// in lib/marketData.js) -- kein Signal, kein dir-Feld, nur Kontext dafür, wie
// teuer/riskant ein sofortiger Handel gerade wäre. Schwellenwerte grob an
// üblichen Spot-Spreads von Krypto-Majors orientiert (BTC/ETH liegen meist
// deutlich unter 0,05%, dünn gehandelte Coins können deutlich weiter sein).
export function liquidityLabel(spreadPct) {
  if (spreadPct == null) return { text: "n/a", cls: "badge-gray" };
  if (spreadPct < 0.05) return { text: `${spreadPct.toFixed(3)}% Spread (eng)`, cls: "badge-green" };
  if (spreadPct < 0.2) return { text: `${spreadPct.toFixed(3)}% Spread`, cls: "badge-gray" };
  return { text: `${spreadPct.toFixed(3)}% Spread (weit)`, cls: "badge-red" };
}

// SuperTrend: ATR-basierter Trendfolge-Indikator (Standard: Periode 10,
// Multiplikator 3). Klassische Konstruktion: eine obere/untere Bandlinie um
// (Hoch+Tief)/2 herum, die sich nur in Richtung des aktuellen Trends
// "nachzieht" (nie gegen den Trend zurückweicht) -- sobald der Schlusskurs
// die jeweils gegenüberliegende Bandlinie durchbricht, kippt der Trend.
// Nutzt computeATRSeries wieder (gleiche Glättung wie bei starken Kerzen).
// Recherche (08/2026): in mehreren Backtesting-Vergleichen einer der
// Top-Performer für Trendfolge-Strategien -- daher hier als Kandidat
// aufgenommen und empirisch gegen diese App's eigene Historie getestet
// (siehe runBacktest useSuperTrend).
export function computeSuperTrendSeries(highs, lows, closes, period = 10, multiplier = 3) {
  const n = highs ? highs.length : 0;
  const atrSeries = computeATRSeries(highs, lows, closes, period);
  const trend = new Array(n).fill(null); // +1 = Aufwärtstrend, -1 = Abwärtstrend
  let upperBand = null,
    lowerBand = null,
    prevTrend = 1;
  for (let i = 0; i < n; i++) {
    const atr = atrSeries[i];
    if (atr == null) continue;
    const hl2 = (highs[i] + lows[i]) / 2;
    const basicUpper = hl2 + multiplier * atr;
    const basicLower = hl2 - multiplier * atr;
    if (upperBand == null) {
      upperBand = basicUpper;
      lowerBand = basicLower;
    } else {
      upperBand = basicUpper < upperBand || closes[i - 1] > upperBand ? basicUpper : upperBand;
      lowerBand = basicLower > lowerBand || closes[i - 1] < lowerBand ? basicLower : lowerBand;
    }
    let curTrend;
    if (closes[i] > upperBand) curTrend = 1;
    else if (closes[i] < lowerBand) curTrend = -1;
    else curTrend = prevTrend;
    trend[i] = curTrend;
    prevTrend = curTrend;
  }
  return trend;
}

// Signal aus einem Trendwechsel (wie smaCrossoverAt): +1 nur am Tag des
// Wechsels auf Aufwärtstrend, sonst "Halten" solange der Trend anhält.
export function superTrendSignalAt(trendSeries, i) {
  if (i < 1 || trendSeries[i] == null || trendSeries[i - 1] == null) return { label: "Neutral", dir: 0 };
  if (trendSeries[i - 1] <= 0 && trendSeries[i] > 0) return { label: "Kaufen (Trendwechsel)", dir: 1 };
  if (trendSeries[i - 1] >= 0 && trendSeries[i] < 0) return { label: "Verkaufen (Trendwechsel)", dir: -1 };
  return { label: trendSeries[i] > 0 ? "Halten (Aufwärtstrend)" : "Halten (Abwärtstrend)", dir: trendSeries[i] > 0 ? 0.5 : -0.5 };
}

// Donchian-Kanal-Ausbruch (klassische "Turtle Trading"-Strategie): oberes/
// unteres Band = höchstes Hoch / tiefstes Tief der letzten `period` Tage,
// bewusst OHNE den heutigen Tag (Fenster i-period..i-1) -- sonst würde der
// heutige Ausreißertag sein eigenes Band definieren und nie ausbrechen
// können (gleiches Lookahead-Vermeidungsmuster wie beim ATR-Vergleich in
// computeStrongCandleSeries). Schlusskurs über dem Band = Ausbruch nach
// oben, unter dem Band = Ausbruch nach unten.
export function computeDonchianSeries(highs, lows, period = 20) {
  const n = highs ? highs.length : 0;
  const upper = new Array(n).fill(null);
  const lower = new Array(n).fill(null);
  for (let i = period; i < n; i++) {
    let hi = -Infinity,
      lo = Infinity;
    for (let j = i - period; j < i; j++) {
      if (highs[j] > hi) hi = highs[j];
      if (lows[j] < lo) lo = lows[j];
    }
    upper[i] = hi;
    lower[i] = lo;
  }
  return { upper, lower };
}

export function donchianSignalAt(closes, upperSeries, lowerSeries, i) {
  if (upperSeries[i] == null || lowerSeries[i] == null) return { label: "Neutral", dir: 0 };
  if (closes[i] > upperSeries[i]) return { label: "Kaufen (Ausbruch)", dir: 1 };
  if (closes[i] < lowerSeries[i]) return { label: "Verkaufen (Ausbruch)", dir: -1 };
  return { label: "Neutral (im Kanal)", dir: 0 };
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

// Kompakter Preis-/Indikator-Schnappschuss für einen einzelnen Coin --
// genutzt von pages/api/chart-analysis.js, um die Bild-Analyse mit echten
// Zahlen zu unterfüttern (reiner Extraktions-Helper, keine bestehende
// Funktion/Aufrufer ändert sich). `c` hat die gleiche Form wie ein Eintrag
// aus fetchCryptoData(): {price, change24h, prices, volumes}.
export function computeCoreSignalSnapshot(c) {
  const rsi = computeRSI(c.prices);
  const macd = computeMACD(c.prices);
  const macdSig = macdSignal(macd);
  const smaSig = smaSignal(c.prices);
  return { price: c.price, change24h: c.change24h, rsi, macdLabel: macdSig.label, smaLabel: smaSig.label };
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
    const { percentB } = computeBollinger(c.prices);
    const bollSig = bollingerSignal(percentB);
    const { k } = computeStochRSI(c.prices);
    const stochRsiSig = stochRsiSignal(k);
    const obvSig = computeOBVSignal(c.prices, c.volumes);
    const candleSig = c.highs && c.lows ? strongCandleSignal(c.highs, c.lows, c.prices) : { label: "n/a", dir: 0 };
    const marubozuSig = c.opens && c.highs && c.lows ? marubozuSignal(c.opens, c.highs, c.lows, c.prices) : { label: "n/a", dir: 0 };
    // bollSig/stochRsiSig/obvSig/candleSig/marubozuSig fließen bewusst nicht
    // in combineSignal ein (siehe combineSignal-Kommentar) – hier trotzdem
    // mitberechnet/zurückgegeben, falls sie später für Anzeige- oder
    // Debug-Zwecke gebraucht werden.
    const combined = combineSignal(smaSig, rsi, macro, fgValue, macdSig, volSig, { whaleSig });
    return { coin: c, rsi, smaSig, macdSig, volSig, whaleSig, bollSig, stochRsiSig, obvSig, candleSig, marubozuSig, combined };
  });
}
