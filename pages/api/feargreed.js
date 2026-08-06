// Fear & Greed Index von alternative.me - kostenlos, kein Key nötig
import { fetchFearGreedData } from "../../lib/marketData";

export default async function handler(req, res) {
  try {
    const data = await fetchFearGreedData();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
