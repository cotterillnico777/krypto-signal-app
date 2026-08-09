import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "endpoint fehlt." });

  try {
    const { error } = await ctx.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", ctx.user.id)
      .eq("endpoint", endpoint);
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message || "Entfernen fehlgeschlagen." });
  }
}
