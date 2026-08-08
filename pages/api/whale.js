// Long/Short-Positionsratio der Top-Trader auf Binance-USDT-Perpetuals –
// kostenlos, kein Key nötig. Siehe fetchWhaleData in lib/marketData.js für
// Details und Einschränkungen (nur ~30 Tage Historie, daher nicht für den
// Backtest nutzbar, nur fürs Live-Dashboard).
import { fetchWhaleData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const data = await fetchWhaleData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der Whale-Daten" });
  }
}
