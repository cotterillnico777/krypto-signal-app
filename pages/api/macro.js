// Diese Route holt echte Makrodaten von FRED (Federal Reserve Economic Data).
// Du brauchst dafür einen kostenlosen API-Key, siehe README.md.
//
// Serien:
// - M2SL: M2-Geldmenge (monatlich, saisonbereinigt) in Mrd. USD
// - FEDFUNDS: Effektiver US-Leitzins (monatlich) in %

import { fetchMacroData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const data = await fetchMacroData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der Makrodaten" });
  }
}
