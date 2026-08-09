// Läuft täglich per Vercel Cron (siehe vercel.json). Berechnet für jede Coin
// das kombinierte Signal (dieselbe Logik wie das Dashboard, lib/signals.js)
// und schickt eine Push-Benachrichtigung, sobald ein Coin neu auf "Kaufen"
// wechselt (kein Spam, solange das Signal "Kaufen" bleibt).
//
// Push-Abos liegen seit der Account-Einführung in Supabase Postgres
// (push_subscriptions), nicht mehr in einer globalen Redis-Hash -- der Cron
// hat keine eigene Nutzer-Session, darum liest er über den Service-Role-
// Client (umgeht RLS) und filtert selbst auf Nutzer mit aktivem Zugang
// (aktives Abo ODER laufender Trial). push:lastsignal:{coinId} bleibt in
// Redis -- das ist echter globaler Marktstatus, hat nichts mit einzelnen
// Nutzern zu tun.

import webpush from "web-push";
import { getRedis } from "../../../lib/redis";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { fetchCryptoData, fetchMacroData, fetchFearGreedData, fetchWhaleData } from "../../../lib/marketData";
import { computeMacroRegime, computeAllSignals } from "../../../lib/signals";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true; // kein Secret konfiguriert -> nicht absichern (nur für lokale Tests)
  const header = req.headers.authorization;
  if (header === `Bearer ${secret}`) return true;
  if (req.query.secret === secret) return true;
  return false;
}

// Dieselbe "ist der Zugang aktiv"-Logik wie lib/auth/getProfileAccess.js,
// hier über die gejointen Zeilen angewendet statt über ein einzelnes Profil.
function hasActiveAccess(profile) {
  if (!profile) return false;
  const trialing = profile.subscription_status === "trialing" && new Date(profile.trial_ends_at) > new Date();
  return profile.subscription_status === "active" || trialing;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: "Nicht autorisiert." });

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: "UPSTASH_REDIS_REST_URL/TOKEN fehlt." });
  const supabaseAdmin = getSupabaseAdminClient();
  if (!supabaseAdmin) return res.status(500).json({ error: "SUPABASE_SERVICE_ROLE_KEY/NEXT_PUBLIC_SUPABASE_URL fehlt." });
  if (!process.env.VAPID_PRIVATE_KEY || !process.env.VAPID_PUBLIC_KEY) {
    return res.status(500).json({ error: "VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY fehlt." });
  }

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:example@example.com",
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  try {
    const [coins, macroRaw, fg, whale] = await Promise.all([
      fetchCryptoData("1D"),
      fetchMacroData(),
      fetchFearGreedData().catch(() => null),
      fetchWhaleData().catch(() => ({})),
    ]);
    const macro = computeMacroRegime(macroRaw.m2, macroRaw.fedfunds, macroRaw.dxy, macroRaw.yield10y, macroRaw.vix);
    const signals = computeAllSignals(coins, macro, fg?.value ?? null, whale);

    const { data: subRows, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, subscription, profiles(subscription_status, trial_ends_at)");
    if (subError) throw subError;

    const subscriptions = (subRows || []).filter((r) => hasActiveAccess(r.profiles)).map((r) => r.subscription);

    const notified = [];
    const checked = [];

    for (const { coin, combined } of signals) {
      checked.push({ id: coin.id, signal: combined.label });
      const stateKey = `push:lastsignal:${coin.id}`;
      const prevLabel = await redis.get(stateKey);
      const isNewBuySignal = combined.label === "Kaufen" && prevLabel !== "Kaufen";
      await redis.set(stateKey, combined.label);

      if (!isNewBuySignal || subscriptions.length === 0) continue;

      const payload = JSON.stringify({
        title: `📈 Kaufsignal: ${coin.name} (${coin.symbol})`,
        body: `Preis $${coin.price.toLocaleString("de-DE", { maximumFractionDigits: coin.price < 10 ? 3 : 0 })} · ${coin.change24h >= 0 ? "+" : ""}${coin.change24h.toFixed(1)}% (24h) · Makro: ${macro.label}`,
        tag: `kaufsignal-${coin.id}`,
        url: "/",
      });

      for (const sub of subscriptions) {
        try {
          await webpush.sendNotification(sub, payload);
          notified.push({ coin: coin.id, endpoint: sub.endpoint });
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }
    }

    res.status(200).json({ checked, notified });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Signal-Check." });
  }
}
