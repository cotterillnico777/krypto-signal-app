// Geteilte Logik für Preis-Alarme (DB-Row <-> App-Objekt, Auslöse-Prüfung).
// Genutzt von pages/api/alerts/*.js und pages/api/cron/check-alerts.js.

export function rowToAlert(row) {
  return {
    id: row.id,
    coinId: row.coin_id,
    direction: row.direction,
    targetPrice: Number(row.target_price),
    createdAt: row.created_at,
  };
}

// Prüft gegen [low, high] (typischerweise das 24h-Hoch/Tief von Binance),
// nicht nur den aktuellen Punktpreis -- Vercel Hobby erlaubt Cron-Jobs nur
// 1x/Tag, ein kurzes Über-/Unterschreiten zwischen zwei Läufen würde sonst
// verpasst.
export function isAlertTriggered(alert, low, high) {
  if (alert.direction === "above") return high >= alert.targetPrice;
  return low <= alert.targetPrice;
}
