import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { rowToHolding, holdingToRow } from "../../../lib/holdings";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { id } = req.query;

  if (req.method === "PATCH") {
    const row = holdingToRow(req.body || {});
    if (Object.keys(row).length === 0) {
      return res.status(400).json({ error: "Keine Felder zum Aktualisieren übergeben." });
    }
    const { data, error } = await ctx.supabase
      .from("holdings")
      .update(row)
      .eq("id", id)
      .eq("user_id", ctx.user.id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ holding: rowToHolding(data) });
  }

  if (req.method === "DELETE") {
    const { error } = await ctx.supabase.from("holdings").delete().eq("id", id).eq("user_id", ctx.user.id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  res.status(405).end();
}
