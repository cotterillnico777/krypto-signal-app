// Cached wie andere externe Datenquellen mit spürbarer Abruflatenz --
// 3 RSS-Feeds parallel abfragen bei jedem Dashboard-Aufruf jedes Nutzers
// wäre unnötig langsam und unhöflich gegenüber den Feed-Betreibern.
// 20 Minuten TTL ist für Schlagzeilen aktuell genug (kein Live-Ticker-
// Anspruch) und hält die Zahl der Upstash-Requests niedrig.
import { fetchNews } from "../../lib/news";
import { getRedis } from "../../lib/redis";

const CACHE_KEY = "news:cache";
const CACHE_TTL_SECONDS = 20 * 60;

export default async function handler(req, res) {
  try {
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        res.status(200).json({ items: cached });
        return;
      }
    }
    const items = await fetchNews();
    if (redis) await redis.set(CACHE_KEY, items, { ex: CACHE_TTL_SECONDS });
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der News." });
  }
}
