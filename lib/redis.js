import { Redis } from "@upstash/redis";

let client = null;

// Lazily created so the app doesn't crash at import time when Upstash env
// vars aren't set yet (e.g. before the user has created an account).
export function getRedis() {
  if (client) return client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  client = new Redis({ url, token });
  return client;
}
