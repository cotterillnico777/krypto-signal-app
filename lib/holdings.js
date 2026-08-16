// Geteilte Logik fürs manuelle Portfolio-Tracking (echte Bestände, nicht
// der hypothetische $10k-Backtest unter /portfolio). Gleiches Muster wie
// lib/trades.js: DB-Zeile <-> camelCase-App-Objekt, Kennzahlen zur
// Laufzeit aus Rohwerten berechnet statt materialisiert.

export function rowToHolding(row) {
  return {
    id: row.id,
    coinId: row.coin_id,
    quantity: Number(row.quantity),
    costBasis: Number(row.cost_basis),
    createdAt: row.created_at,
  };
}

export function holdingToRow(holding) {
  const row = {};
  if (holding.coinId !== undefined) row.coin_id = holding.coinId;
  if (holding.quantity !== undefined) row.quantity = holding.quantity;
  if (holding.costBasis !== undefined) row.cost_basis = holding.costBasis;
  return row;
}

// currentPrice: aktueller Kurs (aus fetchCryptoData, nicht gespeichert) --
// costValue/currentValue in USD, pnlPct relativ zum Einstand.
export function computeHoldingMetrics(holding, currentPrice) {
  const costValue = holding.quantity * holding.costBasis;
  const currentValue = currentPrice != null ? holding.quantity * currentPrice : null;
  const pnl = currentValue != null ? currentValue - costValue : null;
  const pnlPct = currentValue != null && costValue > 0 ? (pnl / costValue) * 100 : null;
  return { costValue, currentValue, pnl, pnlPct };
}
