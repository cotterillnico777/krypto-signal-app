import { fetchCryptoData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const results = await fetchCryptoData(req.query.tf);
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler" });
  }
}
