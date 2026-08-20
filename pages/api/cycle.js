import { COINS } from "../../lib/marketData";
import { getCycleAnalysisCached } from "../../lib/cycleAnalysis";

// Reine Marktdaten, keine KI-Kosten -- bewusst NICHT requireActiveAccessApi-
// gegated, gleiches Muster wie /api/macro, /api/news, /api/crypto (das
// Seiten-Gate auf pages/index.js reicht).
export default async function handler(req, res) {
  const coinId = req.query.coin || "bitcoin";
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) return res.status(400).json({ error: "Unbekannte Coin." });

  try {
    const result = await getCycleAnalysisCached(coinId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler bei der Zyklus-Analyse." });
  }
}
