import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { rowToTrade, tradeToRow } from "../../../lib/trades";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { id } = req.query;

  if (req.method === "PATCH") {
    const row = tradeToRow(req.body || {});
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: "Keine Felder zum Aktualisieren übergeben." });
    }
    // RLS erzwingt user_id = auth.uid() ohnehin, .eq() hier zusätzlich als
    // Defense-in-depth (gleiches Muster wie pages/api/push/unsubscribe.js).
    const { data, error } = await ctx.supabase
      .from("trades")
      .update(row)
      .eq("id", id)
      .eq("user_id", ctx.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ trade: rowToTrade(data) });
  }

  if (req.method === "DELETE") {
    const { error } = await ctx.supabase.from("trades").delete().eq("id", id).eq("user_id", ctx.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
