// Geteilte Berechnungslogik fürs manuelle Trade Tracking + Trading Journal.
// Genutzt sowohl von pages/trades.js (Client-Anzeige) als auch
// pages/api/trades/analyze.js (Server, für den KI-Analyse-Prompt) -- eine
// Quelle der Wahrheit, gleiches Muster wie lib/signals.js.
//
// Erwartet camelCase-Felder (direction, entryPrice, exitPrice, size,
// stopLoss, takeProfit), nicht die snake_case-Spaltennamen der trades-
// Tabelle -- die API-Routen mappen zwischen DB-Zeile und diesem Shape.

// pnl/status werden bewusst nicht in der DB gespeichert, sondern hier aus
// den Rohwerten abgeleitet -- vermeidet inkonsistente Daten, falls ein
// Nutzer Entry/Exit nachträglich korrigiert (gleiches Prinzip wie
// lib/backtest.js: alles wird zur Laufzeit berechnet, nichts materialisiert).
export function computeTradeMetrics(trade) {
  const { direction, entryPrice, exitPrice, size, stopLoss, takeProfit } = trade;
  const dirMult = direction === "long" ? 1 : -1;

  const pnlPct = exitPrice != null ? ((exitPrice - entryPrice) / entryPrice) * 100 * dirMult : null;
  const pnl = pnlPct != null ? (size * pnlPct) / 100 : null;

  const riskPct = stopLoss != null ? Math.abs((entryPrice - stopLoss) / entryPrice) * 100 : null;
  const rewardPct = takeProfit != null ? Math.abs((takeProfit - entryPrice) / entryPrice) * 100 : null;
  const riskRewardRatio = riskPct && rewardPct ? rewardPct / riskPct : null;

  // Tatsächliches Ergebnis in Einheiten des geplanten Risikos (z.B. +2R heißt
  // "doppelt so viel gewonnen wie beim Stop-Loss riskiert wurde") -- nur
  // berechenbar, wenn sowohl ein Exit als auch ein Stop-Loss gesetzt sind.
  const rMultiple = pnlPct != null && riskPct ? pnlPct / riskPct : null;

  const status = exitPrice != null ? "closed" : "open";

  return { pnlPct, pnl, riskPct, rewardPct, riskRewardRatio, rMultiple, status };
}

function avg(arr) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

// Aggregierte Statistik über eine Trade-Liste -- Basis für die Stat-Karten
// auf pages/trades.js UND für den Zahlen-Kontext im KI-Analyse-Prompt.
export function summarizeTrades(trades) {
  const withMetrics = trades.map((t) => ({ ...t, ...computeTradeMetrics(t) }));
  const closed = withMetrics.filter((t) => t.status === "closed");
  const wins = closed.filter((t) => t.pnlPct > 0);

  const winRate = closed.length ? (wins.length / closed.length) * 100 : null;
  const avgPnlPct = avg(closed.map((t) => t.pnlPct));
  const avgRMultiple = avg(closed.filter((t) => t.rMultiple != null).map((t) => t.rMultiple));
  const totalPnl = closed.reduce((sum, t) => sum + (t.pnl || 0), 0);

  return {
    tradeCount: trades.length,
    closedCount: closed.length,
    openCount: trades.length - closed.length,
    winRate,
    avgPnlPct,
    avgRMultiple,
    totalPnl,
  };
}

// Mapping zwischen der snake_case-DB-Zeile (trades-Tabelle) und dem
// camelCase-Shape, den computeTradeMetrics/summarizeTrades und der Client
// erwarten -- hält die DB-Spaltennamen aus dem restlichen JS-Code raus,
// gleiches Prinzip wie die snake_case/camelCase-Trennung in den anderen
// Supabase-Zeilen dieser App.
export function rowToTrade(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    entryPrice: row.entry_price,
    exitPrice: row.exit_price,
    stopLoss: row.stop_loss,
    takeProfit: row.take_profit,
    size: row.size,
    entryAt: row.entry_at,
    exitAt: row.exit_at,
    notes: row.notes,
  };
}

export function tradeToRow(trade) {
  const row = {};
  if (trade.symbol !== undefined) row.symbol = trade.symbol;
  if (trade.direction !== undefined) row.direction = trade.direction;
  if (trade.entryPrice !== undefined) row.entry_price = trade.entryPrice;
  if (trade.exitPrice !== undefined) row.exit_price = trade.exitPrice;
  if (trade.stopLoss !== undefined) row.stop_loss = trade.stopLoss;
  if (trade.takeProfit !== undefined) row.take_profit = trade.takeProfit;
  if (trade.size !== undefined) row.size = trade.size;
  if (trade.entryAt !== undefined) row.entry_at = trade.entryAt;
  if (trade.exitAt !== undefined) row.exit_at = trade.exitAt;
  if (trade.notes !== undefined) row.notes = trade.notes;
  return row;
}

// Pull-Faktor #5 (Gamification): Wochen-Streak + Meilensteine fürs
// Trade-Journal, rein aus bereits geladenen Trades berechnet -- keine
// eigene DB-Tabelle/Migration nötig, gleiches "alles zur Laufzeit
// berechnen"-Prinzip wie computeTradeMetrics/summarizeTrades oben.

// Montag (UTC) der Kalenderwoche, in der `date` liegt -- als konkretes Datum
// statt als Wochennummer-String, um Jahresgrenzen-Sonderfälle (Woche 52/53
// vs. Woche 1) beim Vergleichen zu vermeiden.
function mondayOf(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7; // Montag=1 .. Sonntag=7
  d.setUTCDate(d.getUTCDate() - (dayNum - 1));
  return d;
}

function dateKey(d) {
  return d.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

// ISO-8601-Kalenderwoche (Montag-Start, Woche mit Jahres-Donnerstag = Woche
// 1) als Redis-Key-Suffix -- genutzt vom Weekly-Digest-Cron
// (pages/api/cron/weekly-digest.js) für den Versand-Dedupe-Key, hierher
// verschoben statt dort separat definiert, damit es nur eine Quelle für
// "was ist die aktuelle Kalenderwoche" gibt.
export function isoWeekKey(date) {
  const d = mondayOf(date);
  d.setUTCDate(d.getUTCDate() + 3); // auf den Donnerstag derselben Woche springen (ISO-Jahresbestimmung)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
}

// Wie viele Kalenderwochen in Folge (Montag-Start) wurde mindestens ein Trade
// angelegt? Zählt rückwärts ab der aktuellen Woche -- ist die aktuelle Woche
// noch leer, wird trotzdem ab der letzten Woche MIT Trade weitergezählt (die
// aktuelle Woche ist ja noch nicht vorbei, der Streak soll nicht unfair auf 0
// fallen, nur weil heute noch kein Trade eingetragen wurde).
export function computeStreak(trades) {
  if (!trades.length) return { currentStreak: 0, longestStreak: 0 };

  const weekStartKeys = [...new Set(trades.map((t) => dateKey(mondayOf(new Date(t.entryAt)))))].sort();
  const weekStartDates = weekStartKeys.map((s) => new Date(`${s}T00:00:00Z`));
  const weekSet = new Set(weekStartKeys);

  let cursor = mondayOf(new Date());
  if (!weekSet.has(dateKey(cursor))) cursor = addDays(cursor, -7);
  let currentStreak = 0;
  while (weekSet.has(dateKey(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -7);
  }

  let longestStreak = 0;
  let run = 0;
  let prev = null;
  for (const d of weekStartDates) {
    run = prev && d - prev === 7 * 86400000 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }

  return { currentStreak, longestStreak: Math.max(longestStreak, currentStreak) };
}

const MILESTONES = [1, 5, 10, 25, 50, 100, 250, 500];

export function computeMilestones(tradeCount) {
  const achieved = MILESTONES.filter((m) => tradeCount >= m);
  const next = MILESTONES.find((m) => tradeCount < m) ?? null;
  const currentMilestone = achieved.length ? achieved[achieved.length - 1] : null;
  const progressPct = next ? Math.min(100, (tradeCount / next) * 100) : 100;
  return { achieved, next, currentMilestone, progressPct };
}

// Zusammenfassung für pages/trades.js (Anzeige) und optional den
// Weekly-Digest-Push (Streak-Erwähnung, macht den bestehenden Touchpoint
// nützlicher statt einen weiteren Cron/Push-Pfad zu bauen).
export function computeGamification(trades) {
  const { currentStreak, longestStreak } = computeStreak(trades);
  const { achieved, next, currentMilestone, progressPct } = computeMilestones(trades.length);
  return { currentStreak, longestStreak, achieved, next, currentMilestone, progressPct };
}

// Für den eigenständigen R:R-Rechner (pages/risk-reward.js): welche
// Positionsgröße (USD) verliert bei riskPct% Kontorisiko exakt so viel, wie
// der Stop-Loss-Abstand vom Entry ausmacht.
export function calculatePositionSize({ entryPrice, stopLoss, accountSize, riskPct }) {
  if (!entryPrice || !stopLoss || !accountSize || !riskPct) return null;
  const stopDistancePct = Math.abs((entryPrice - stopLoss) / entryPrice) * 100;
  if (stopDistancePct === 0) return null;
  const riskAmount = (accountSize * riskPct) / 100;
  const positionSize = (riskAmount / stopDistancePct) * 100;
  return { stopDistancePct, riskAmount, positionSize };
}
