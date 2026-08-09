import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const subscription = req.body;
  if (!subscription?.endpoint) {
    return res.status(400).json({ error: "Ungültiges Subscription-Objekt." });
  }

  try {
    const { error } = await ctx.supabase
      .from("push_subscriptions")
      .upsert({ user_id: ctx.user.id, endpoint: subscription.endpoint, subscription }, { onConflict: "endpoint" });
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Speichern fehlgeschlagen." });
  }
}
