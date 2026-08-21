import { fetchCryptoData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const results = await fetchCryptoData(req.query.tf);
    // Header statt Body-Feld -- die Antwort ist bewusst weiterhin ein reines
    // Array (bestehende Konsumenten erwarten das), ein Zeitstempel im Header
    // ist additiv und bricht nichts. Genutzt fürs "Datenstand"-UI im
    // Dashboard (pages/index.js).
    res.setHeader("X-Fetched-At", new Date().toISOString());
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler" });
  }
}
