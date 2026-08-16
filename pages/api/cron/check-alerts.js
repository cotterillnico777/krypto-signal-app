// Läuft täglich per Vercel Cron (siehe vercel.json). Prüft alle aktiven
// Preis-Alarme gegen das 24h-Hoch/Tief jeder Coin (nicht nur den
// Punktpreis zum Cron-Zeitpunkt -- Vercel Hobby erlaubt Cron-Jobs nur
// 1x/Tag, siehe lib/priceAlerts.js), schickt bei Treffer eine Push-
// Benachrichtigung an den jeweiligen Nutzer und löscht den Alarm danach
// (einmalig auslösend, kein Re-Trigger).

import webpush from "web-push";
import { getSupabaseAdminClient } from "../../../lib/supabase/admin";
import { fetchCryptoData } from "../../../lib/marketData";
import { hasActiveAccess } from "../../../lib/auth/hasActiveAccess";
import { rowToAlert, isAlertTriggered } from "../../../lib/priceAlerts";

function isAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = req.headers.authorization;
  if (header === `Bearer ${secret}`) return true;
  if (req.query.secret === secret) return true;
  return false;
}

export default async function handler(req, res) {
  if (!isAuthorized(req)) return res.status(401).json({ error: "Nicht autorisiert." });

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
    const { data: alertRows, error: alertError } = await supabaseAdmin
      .from("price_alerts")
      .select("*, profiles(subscription_status, trial_ends_at)");
    if (alertError) throw alertError;

    const activeAlertRows = (alertRows || []).filter((r) => hasActiveAccess(r.profiles));
    const checked = activeAlertRows.length;

    if (checked === 0) {
      return res.status(200).json({ checked: 0, triggered: 0, notified: 0 });
    }

    const coins = await fetchCryptoData("1D");
    const coinById = Object.fromEntries(coins.map((c) => [c.id, c]));

    const triggeredRows = activeAlertRows.filter((r) => {
      const coin = coinById[r.coin_id];
      if (!coin) return false;
      return isAlertTriggered(rowToAlert(r), coin.low24h, coin.high24h);
    });

    let notified = 0;
    if (triggeredRows.length > 0) {
      const userIds = [...new Set(triggeredRows.map((r) => r.user_id))];
      const { data: subRows, error: subError } = await supabaseAdmin
        .from("push_subscriptions")
        .select("user_id, endpoint, subscription")
        .in("user_id", userIds);
      if (subError) throw subError;

      const subsByUser = new Map();
      for (const s of subRows || []) {
        const list = subsByUser.get(s.user_id) || [];
        list.push(s);
        subsByUser.set(s.user_id, list);
      }

      for (const row of triggeredRows) {
        const coin = coinById[row.coin_id];
        const alert = rowToAlert(row);
        const payload = JSON.stringify({
          title: `🔔 Preis-Alarm: ${coin.name} (${coin.symbol})`,
          body: `${alert.direction === "above" ? "über" : "unter"} $${alert.targetPrice.toLocaleString("de-DE")} -- aktuell $${coin.price.toLocaleString("de-DE")}`,
          tag: `price-alert-${alert.id}`,
          url: "/alerts",
        });

        for (const sub of subsByUser.get(row.user_id) || []) {
          try {
            await webpush.sendNotification(sub.subscription, payload);
            notified++;
          } catch (err) {
            if (err.statusCode === 404 || err.statusCode === 410) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
            }
          }
        }

        // Einmalig auslösend: der Alarm hat seinen Zweck erfüllt (Preis wurde
        // erreicht), unabhängig davon ob die Zustellung selbst geklappt hat --
        // eine tote Subscription wird oben separat bereinigt.
        await supabaseAdmin.from("price_alerts").delete().eq("id", row.id);
      }
    }

    res.status(200).json({ checked, triggered: triggeredRows.length, notified });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Preis-Alarm-Check." });
  }
}
