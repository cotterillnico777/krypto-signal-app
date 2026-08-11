import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { rowToTrade, tradeToRow } from "../../../lib/trades";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    const { data, error } = await ctx.supabase
      .from("trades")
      .select("*")
      .eq("user_id", ctx.user.id)
      .order("entry_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ trades: data.map(rowToTrade) });
  }

  if (req.method === "POST") {
    const { symbol, direction, entryPrice, size } = req.body || {};
    if (!symbol || !direction || !entryPrice || !size) {
      return res.status(400).json({ error: "symbol, direction, entryPrice und size sind Pflichtfelder." });
    }
    if (direction !== "long" && direction !== "short") {
      return res.status(400).json({ error: "direction muss 'long' oder 'short' sein." });
    }

    const row = { ...tradeToRow(req.body), user_id: ctx.user.id };
    const { data, error } = await ctx.supabase.from("trades").insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ trade: rowToTrade(data) });
  }

  res.status(405).end();
}
