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
        // fetchedAt kommt aus dem Cache-Wert selbst -- zeigt den echten
        // ursprünglichen Abruf-Zeitpunkt, nicht den Zeitpunkt dieses
        // Cache-Treffers (fürs "Datenstand"-UI im Dashboard).
        res.setHeader("X-Fetched-At", cached.fetchedAt || new Date().toISOString());
        res.status(200).json({ items: cached.items });
        return;
      }
    }
    const items = await fetchNews();
    const fetchedAt = new Date().toISOString();
    if (redis) await redis.set(CACHE_KEY, { items, fetchedAt }, { ex: CACHE_TTL_SECONDS });
    res.setHeader("X-Fetched-At", fetchedAt);
    res.status(200).json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der News." });
  }
}
