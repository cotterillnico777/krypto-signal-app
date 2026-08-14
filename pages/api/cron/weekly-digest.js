// Läuft wöchentlich per Vercel Cron (siehe vercel.json, montags 08:00 UTC --
// eigener Cron-Eintrag, kein Anbau an check-signals.js: Vercel Hobby erlaubt
// laut aktueller Doku bis zu 100 Cron-Jobs/Projekt, nur jeder einzelne
// maximal 1×/Tag, die alte "nur 1 Cron insgesamt"-Annahme war überholt).
//
// Schickt Push-Abonnenten mit mindestens einem geloggten Trade eine kurze
// Wochenstatistik ihres Journals (lib/trades.js summarizeTrades) -- bewusst
// KEINE automatische Anthropic-Anfrage (Kosten pro Nutzer/Woche wären
// unkontrolliert skalierend), die "🤖 KI-Analyse" bleibt nutzerinitiiert
// (pages/api/trades/analyze.js). Nutzer ohne Trades werden übersprungen,
// keine "leere" Benachrichtigung.

import webpush from "web-push";
import { getRedis } from "../../../lib/redis";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { hasActiveAccess } from "../../../lib/auth/hasActiveAccess";
import { rowToTrade, summarizeTrades, computeGamification, isoWeekKey } from "../../../lib/trades";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization;
  if (header === `Bearer ${secret}`) return true;
  if (req.query.secret === secret) return true;
  return false;
}

function fmtPnl(n) {
  return `${n >= 0 ? "+" : ""}$${n.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`;
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

  const week = isoWeekKey(new Date());

  try {
    const { data: subRows, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("user_id, endpoint, subscription, profiles(subscription_status, trial_ends_at)");
    if (subError) throw subError;

    const activeSubs = (subRows || []).filter((r) => hasActiveAccess(r.profiles));
    const userIds = [...new Set(activeSubs.map((r) => r.user_id))];

    let tradesByUser = new Map();
    if (userIds.length > 0) {
      const { data: tradeRows, error: tradeError } = await supabaseAdmin
        .from("trades")
        .select("*")
        .in("user_id", userIds);
      if (tradeError) throw tradeError;
      tradesByUser = new Map();
      for (const row of tradeRows || []) {
        const list = tradesByUser.get(row.user_id) || [];
        list.push(rowToTrade(row));
        tradesByUser.set(row.user_id, list);
      }
    }

    let digestsSent = 0;
    let usersSkippedNoTrades = 0;
    let usersSkippedAlreadySent = 0;
    const notified = [];

    for (const userId of userIds) {
      const trades = tradesByUser.get(userId) || [];
      if (trades.length === 0) {
        usersSkippedNoTrades++;
        continue;
      }

      const dedupeKey = `digest:sent:${userId}:${week}`;
      const alreadySent = await redis.get(dedupeKey);
      if (alreadySent) {
        usersSkippedAlreadySent++;
        continue;
      }

      const stats = summarizeTrades(trades);
      const { currentStreak } = computeGamification(trades);
      const streakSuffix = currentStreak >= 2 ? ` · 🔥 ${currentStreak} Wochen-Streak` : "";
      const payload = JSON.stringify({
        title: "📊 Dein Wochen-Rückblick",
        body: `${stats.tradeCount} Trade${stats.tradeCount === 1 ? "" : "s"} im Journal · ${stats.winRate != null ? `${stats.winRate.toFixed(0)}% Trefferquote` : "noch keine geschlossen"} · Gesamt-PnL ${fmtPnl(stats.totalPnl)}${streakSuffix}`,
        tag: "weekly-digest",
        url: "/trades",
      });

      const subsForUser = activeSubs.filter((r) => r.user_id === userId).map((r) => r.subscription);
      let sentAny = false;
      for (const sub of subsForUser) {
        try {
          await webpush.sendNotification(sub, payload);
          notified.push({ userId, endpoint: sub.endpoint });
          sentAny = true;
        } catch (err) {
          if (err.statusCode === 404 || err.statusCode === 410) {
            await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
          }
        }
      }

      if (sentAny) {
        digestsSent++;
        await redis.set(dedupeKey, "1", { ex: 8 * 24 * 60 * 60 });
      }
    }

    res.status(200).json({ week, digestsSent, usersSkippedNoTrades, usersSkippedAlreadySent, notified });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Wochen-Digest." });
  }
}
