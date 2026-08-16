import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { id } = req.query;

  if (req.method === "DELETE") {
    const { error } = await ctx.supabase.from("price_alerts").delete().eq("id", id).eq("user_id", ctx.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
