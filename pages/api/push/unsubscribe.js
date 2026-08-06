import { getRedis } from "../../../lib/redis";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const redis = getRedis();
  if (!redis) {
    return res.status(500).json({ error: "UPSTASH_REDIS_REST_URL/TOKEN fehlt. Siehe README.md." });
  }

  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "endpoint fehlt." });

  try {
    await redis.hdel("push:subscriptions", endpoint);
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Entfernen fehlgeschlagen." });
  }
}
