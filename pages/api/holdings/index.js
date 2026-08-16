import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { rowToHolding, holdingToRow } from "../../../lib/holdings";
import { COINS, fetchCryptoData } from "../../../lib/marketData";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    const [{ data, error }, coins] = await Promise.all([
      ctx.supabase.from("holdings").select("*").eq("user_id", ctx.user.id).order("created_at", { ascending: false }),
      fetchCryptoData("1D").catch(() => []),
    ]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      holdings: data.map(rowToHolding),
      coins: coins.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, price: c.price })),
    });
  }

  if (req.method === "POST") {
    const { coinId, quantity, costBasis } = req.body || {};
    if (!coinId || !quantity || costBasis == null) {
      return res.status(400).json({ error: "coinId, quantity und costBasis sind Pflichtfelder." });
    }
    if (!COINS.some((c) => c.id === coinId)) {
      return res.status(400).json({ error: "Unbekannte Coin." });
    }
    const qty = parseFloat(quantity);
    const cost = parseFloat(costBasis);
    if (!(qty > 0)) return res.status(400).json({ error: "quantity muss größer als 0 sein." });
    if (!(cost >= 0)) return res.status(400).json({ error: "costBasis muss 0 oder größer sein." });

    const row = { user_id: ctx.user.id, ...holdingToRow({ coinId, quantity: qty, costBasis: cost }) };
    const { data, error } = await ctx.supabase.from("holdings").insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ holding: rowToHolding(data) });
  }

  res.status(405).end();
}
