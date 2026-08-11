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
