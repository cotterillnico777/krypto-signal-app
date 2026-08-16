import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { rowToAlert } from "../../../lib/priceAlerts";
import { COINS, fetchCryptoData } from "../../../lib/marketData";

export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  if (req.method === "GET") {
    const [{ data, error }, coins] = await Promise.all([
      ctx.supabase.from("price_alerts").select("*").eq("user_id", ctx.user.id).order("created_at", { ascending: false }),
      fetchCryptoData("1D").catch(() => []),
    ]);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({
      alerts: data.map(rowToAlert),
      coins: coins.map((c) => ({ id: c.id, symbol: c.symbol, name: c.name, price: c.price })),
    });
  }

  if (req.method === "POST") {
    const { coinId, direction, targetPrice } = req.body || {};
    if (!coinId || !direction || !targetPrice) {
      return res.status(400).json({ error: "coinId, direction und targetPrice sind Pflichtfelder." });
    }
    if (!COINS.some((c) => c.id === coinId)) {
      return res.status(400).json({ error: "Unbekannte Coin." });
    }
    if (direction !== "above" && direction !== "below") {
      return res.status(400).json({ error: "direction muss 'above' oder 'below' sein." });
    }
    const price = parseFloat(targetPrice);
    if (!(price > 0)) {
      return res.status(400).json({ error: "targetPrice muss größer als 0 sein." });
    }

    const row = { user_id: ctx.user.id, coin_id: coinId, direction, target_price: price };
    const { data, error } = await ctx.supabase.from("price_alerts").insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ alert: rowToAlert(data) });
  }

  res.status(405).end();
}
