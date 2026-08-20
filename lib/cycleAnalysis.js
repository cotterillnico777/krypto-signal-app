// Zyklus-Analyse (ATH/Tief des vorherigen Bullruns, Bodenbildung,
// übergeordneter Trendwechsel, Zeitvergleich zum vorherigen Zyklus) --
// rein informativ für Dashboard-Anzeige und KI-Analyse-Kontext, NICHT in
// combineSignal() eingespeist (gleiche "erst anzeigen, erst nach Walk-
// Forward-Validierung wiren"-Regel wie bei Bollinger/StochRSI/OBV, siehe
// /validation).
import { COINS, fetchHistoricalSeries } from "./marketData";
import { computeRSISeries, computeMACDSeries, computeDonchianSeries, computeSuperTrendSeries, superTrendSignalAt } from "./signals";
import { getRedis } from "./redis";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_DRAWDOWN_THRESHOLD = 0.5; // -50% schließt einen "abgeschlossenen Zyklus" ab
const MIN_DRAWDOWN_FOR_BOTTOM_SCORE = 0.2; // unter -20% vom aktuellen Zyklus-ATH ist eine Bodenbildungs-Bewertung nicht aussagekräftig
const MIN_HISTORY_DAYS_FOR_CYCLE = 180;
const CACHE_TTL_SECONDS = 6 * 60 * 60; // Zyklus-Kennzahlen bewegen sich langsam, gleiche Größenordnung wie die Makro-Karte

// Ein Durchlauf, laufendes ATH + laufender Tiefpunkt seit diesem ATH. Ein
// "abgeschlossener Zyklus" wird erst erkannt, wenn der Kurs seit dem letzten
// ATH um >= drawdownThreshold gefallen ist, BEVOR ein neues ATH erreicht
// wird -- das unterscheidet einen echten Zyklus-Top/Bottom von einem
// gewöhnlichen Pullback im laufenden Bullrun. `current` ist immer der
// gerade offene Zyklus (das noch nicht unterbotene laufende ATH).
export function segmentCycles(prices, drawdownThreshold = DEFAULT_DRAWDOWN_THRESHOLD) {
  let athIdx = 0,
    athV = prices[0].v;
  let curBottomIdx = 0,
    curBottomV = prices[0].v;
  let maxDrawdownReached = 0;
  const cycles = [];

  for (let i = 1; i < prices.length; i++) {
    const v = prices[i].v;
    if (v > athV) {
      if (maxDrawdownReached <= -drawdownThreshold) {
        cycles.push({
          athIdx,
          athT: prices[athIdx].t,
          athV,
          bottomIdx: curBottomIdx,
          bottomT: prices[curBottomIdx].t,
          bottomV: curBottomV,
          reclaimedT: prices[i].t,
          drawdownPct: maxDrawdownReached * 100,
          daysAthToBottom: Math.round((prices[curBottomIdx].t - prices[athIdx].t) / DAY_MS),
          daysBottomToReclaim: Math.round((prices[i].t - prices[curBottomIdx].t) / DAY_MS),
        });
      }
      athIdx = i;
      athV = v;
      curBottomIdx = i;
      curBottomV = v;
      maxDrawdownReached = 0;
    } else {
      if (v < curBottomV) {
        curBottomV = v;
        curBottomIdx = i;
      }
      const dd = (v - athV) / athV;
      if (dd < maxDrawdownReached) maxDrawdownReached = dd;
    }
  }

  const current = {
    athT: prices[athIdx].t,
    athV,
    maxDrawdownPct: maxDrawdownReached * 100,
    isAllTimeHighNow: athIdx === prices.length - 1,
  };

  return { cycles, current };
}

function localMinIdx(prices, from, to) {
  let idx = from;
  for (let i = from + 1; i <= to; i++) if (prices[i] < prices[idx]) idx = i;
  return idx;
}

// Klassische bullische RSI-Divergenz: das jüngere Preistief liegt niedriger
// als das ältere, aber der RSI an diesem jüngeren Tief liegt höher --
// deutet auf nachlassenden Verkaufsdruck trotz neuem Tiefpunkt hin.
function detectBullishDivergence(prices, rsiSeries, lookback = 120) {
  const n = prices.length;
  const from = Math.max(0, n - lookback);
  const mid = Math.floor((from + n - 1) / 2);
  if (mid <= from || n - 1 <= mid) return false;
  const idx1 = localMinIdx(prices, from, mid);
  const idx2 = localMinIdx(prices, mid + 1, n - 1);
  if (rsiSeries[idx1] == null || rsiSeries[idx2] == null) return false;
  return prices[idx2] < prices[idx1] && rsiSeries[idx2] > rsiSeries[idx1];
}

// Basisbildung nahe der 50-Tage-Tiefzone: Kurs aktuell nah am Donchian-
// Unterband, aber seit `noBreakDays` kein neuer Tiefpunkt mehr -- ein
// einfacher "wiederholter Test ohne Bruch"-Proxy für eine mögliche
// Doppel-Boden-Formation, ohne eigene Pivot-Erkennung neu zu schreiben.
function detectBasingNearDonchianLow(prices, lowerBand, { proximityPct = 5, noBreakDays = 10 } = {}) {
  const last = prices.length - 1;
  if (lowerBand[last] == null) return false;
  const nearNow = ((prices[last] - lowerBand[last]) / lowerBand[last]) * 100 <= proximityPct;
  if (!nearNow) return false;
  for (let i = Math.max(0, last - noBreakDays + 1); i <= last; i++) {
    if (lowerBand[i] != null && prices[i] < lowerBand[i]) return false;
  }
  return true;
}

// MACD-Histogramm dreht: noch negativ, aber weniger negativ als vor
// `window` Tagen -- Momentum verliert auf der Verkaufsseite an Kraft.
function detectMacdHistogramUpturn(macdLine, signalLine, window = 10) {
  const n = macdLine.length;
  const hist = [];
  for (let i = Math.max(0, n - window); i < n; i++) {
    if (macdLine[i] == null || signalLine[i] == null) continue;
    hist.push(macdLine[i] - signalLine[i]);
  }
  if (hist.length < 2) return false;
  const first = hist[0],
    lastV = hist[hist.length - 1];
  return lastV < 0 && lastV > first;
}

// Score 0-3, nur aussagekräftig ab einem nennenswerten Drawdown vom
// aktuellen Zyklus-ATH -- sonst score:null ("nicht anwendbar"). Rein
// informativ, siehe Datei-Kopfkommentar.
export function computeBottomFormationScore(prices, highs, lows, currentDrawdownPct) {
  if (currentDrawdownPct == null || currentDrawdownPct > -MIN_DRAWDOWN_FOR_BOTTOM_SCORE * 100) {
    return { score: null, maxScore: 3, reasons: [] };
  }

  let score = 0;
  const reasons = [];

  const rsiSeries = computeRSISeries(prices, 14);
  if (detectBullishDivergence(prices, rsiSeries)) {
    score += 1;
    reasons.push("rsiDivergence");
  }

  const { lower } = computeDonchianSeries(highs, lows, 50);
  if (detectBasingNearDonchianLow(prices, lower)) {
    score += 1;
    reasons.push("donchianBasing");
  }

  const { macdLine, signalLine } = computeMACDSeries(prices);
  if (detectMacdHistogramUpturn(macdLine, signalLine)) {
    score += 1;
    reasons.push("macdUpturn");
  }

  return { score, maxScore: 3, reasons };
}

// Bucketet Tageskerzen von hinten nach vorn in Wochenkerzen (die jüngste
// Woche ist vollständig/ausgerichtet, ein evtl. unvollständiger Rest landet
// am ältesten Ende -- fällt am wenigsten ins Gewicht).
function resampleToWeekly(opens, highs, lows, closes) {
  const n = closes.length;
  const weeks = [];
  let i = n;
  while (i > 0) {
    const start = Math.max(0, i - 7);
    let hi = -Infinity,
      lo = Infinity;
    for (let j = start; j < i; j++) {
      if (highs[j] > hi) hi = highs[j];
      if (lows[j] < lo) lo = lows[j];
    }
    weeks.unshift({ o: opens[start], c: closes[i - 1], h: hi, l: lo });
    i = start;
  }
  return {
    opens: weeks.map((w) => w.o),
    highs: weeks.map((w) => w.h),
    lows: weeks.map((w) => w.l),
    closes: weeks.map((w) => w.c),
  };
}

// Übergeordneter (wöchentlicher) Trendwechsel -- bewusst auf Wochenbasis
// statt der bereits bestehenden Tages-SuperTrend-Logik, um einen
// großräumigen Regimewechsel von täglichem Rauschen zu trennen. Nutzt
// dieselben Labels wie superTrendSignalAt (server-seitig Deutsch, siehe
// lib/signals.js).
export function computeCycleTrendRegime(opens, highs, lows, closes) {
  const weekly = resampleToWeekly(opens, highs, lows, closes);
  if (weekly.closes.length < 15) return { label: "Neutral", dir: 0, weeksInTrend: null };

  const trend = computeSuperTrendSeries(weekly.highs, weekly.lows, weekly.closes, 10, 3);
  const last = trend.length - 1;
  const sig = superTrendSignalAt(trend, last);

  let weeksInTrend = 1;
  for (let i = last - 1; i >= 0 && trend[i] != null && trend[i] === trend[last]; i--) weeksInTrend++;

  return { label: sig.label, dir: sig.dir, weeksInTrend };
}

function isoDate(t) {
  return new Date(t).toISOString().slice(0, 10);
}

// Orchestrator: nimmt fetchHistoricalSeries()' Rohdaten entgegen und gibt
// NUR Zahlen/kurze Enum-Labels zurück, keine fertigen deutschen Satz-
// Strings -- die App ist durchgängig zweisprachig, Prosa-Sätze serverseitig
// fest auf Deutsch zu bauen würde die EN-Ansicht kaputt machen. Die
// Dashboard-Karte baut Sätze clientseitig über t()/Interpolation aus diesen
// Zahlen; pages/api/analyze.js und chart-analysis.js (rein serverseitig,
// immer Deutsch) dürfen die Zahlen direkt zu deutschen Prompt-Sätzen
// zusammensetzen.
export function analyzeCoinCycle(coin, series) {
  const prices = series.prices;
  const historyDays = prices.length ? Math.round((prices.at(-1).t - prices[0].t) / DAY_MS) : 0;

  if (prices.length < 30 || historyDays < MIN_HISTORY_DAYS_FOR_CYCLE) {
    return { coinId: coin.id, symbol: coin.symbol, hasEnoughHistory: false, historyDays };
  }

  const { cycles, current } = segmentCycles(prices);
  const previousCycle = cycles.length ? cycles[cycles.length - 1] : null;

  const daysSinceCurrentAth = Math.round((Date.now() - current.athT) / DAY_MS);

  const flatPrices = prices.map((p) => p.v);
  const flatHighs = series.highs.map((p) => p.v);
  const flatLows = series.lows.map((p) => p.v);
  const flatOpens = series.opens.map((p) => p.v);

  const bottomFormation = computeBottomFormationScore(flatPrices, flatHighs, flatLows, current.maxDrawdownPct);
  const trendRegime = computeCycleTrendRegime(flatOpens, flatHighs, flatLows, flatPrices);

  return {
    coinId: coin.id,
    symbol: coin.symbol,
    hasEnoughHistory: true,
    historyDays,
    previousCycle: previousCycle && {
      athDate: isoDate(previousCycle.athT),
      athPrice: previousCycle.athV,
      bottomDate: isoDate(previousCycle.bottomT),
      bottomPrice: previousCycle.bottomV,
      reclaimDate: isoDate(previousCycle.reclaimedT),
      drawdownPct: previousCycle.drawdownPct,
      daysAthToBottom: previousCycle.daysAthToBottom,
      daysBottomToReclaim: previousCycle.daysBottomToReclaim,
    },
    currentCycle: {
      athDate: isoDate(current.athT),
      athPrice: current.athV,
      daysSinceAth: daysSinceCurrentAth,
      drawdownFromAthPct: current.maxDrawdownPct,
      isMakingNewHighs: current.isAllTimeHighNow,
    },
    cycleTimeComparison: previousCycle
      ? {
          daysSinceCurrentAth,
          daysAthToBottomPreviousCycle: previousCycle.daysAthToBottom,
          pctOfPreviousDuration: previousCycle.daysAthToBottom > 0 ? Math.round((daysSinceCurrentAth / previousCycle.daysAthToBottom) * 100) : null,
        }
      : null,
    bottomFormation,
    trendRegime,
    completedCycleCount: cycles.length,
  };
}

const HISTORY_DAYS = 3000; // gleiche Grenze wie MAX_DAYS in backtest.js/optimize.js/walkforward.js

// Redis-gecachte Variante (6h TTL) -- von pages/api/cycle.js UND
// pages/api/chart-analysis.js genutzt, damit die Bild-Analyse nicht ein
// zweites Mal 3000 Tage Binance-Historie live abrufen muss.
export async function getCycleAnalysisCached(coinId) {
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return null;

  const redis = getRedis();
  const cacheKey = `cycle:cache:${coinId}`;
  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return cached;
  }
  const series = await fetchHistoricalSeries(coinId, HISTORY_DAYS);
  const result = analyzeCoinCycle(coin, series);
  if (redis) await redis.set(cacheKey, result, { ex: CACHE_TTL_SECONDS });
  return result;
}
