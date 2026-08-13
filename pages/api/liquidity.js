// Orderbuch-Kennzahlen (Geld-Brief-Spanne, Tiefe) auf Binance-Spot-Basis –
// kostenlos, kein Key nötig. Siehe fetchOrderBookData in lib/marketData.js
// für Details und Einschränkungen (nur aktueller Zustand, keine Historie
// verfügbar, daher nicht für den Backtest nutzbar, nur fürs Live-Dashboard).
import { fetchOrderBookData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const data = await fetchOrderBookData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der Orderbuch-Daten" });
  }
}
