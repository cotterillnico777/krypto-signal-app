import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";
import { getRedis } from "../../../lib/redis";
import { rowToTrade, summarizeTrades, computeTradeMetrics } from "../../../lib/trades";

const DAILY_LIMIT = 5;
// Deckel auf die im Prompt aufgeführten Einzel-Trades, unabhängig von der
// Gesamt-Historie -- begrenzt Prompt-Länge/Kosten bei langer Trade-Historie
// (die Statistik in summarizeTrades() läuft trotzdem über ALLE Trades).
const MAX_TRADES_IN_PROMPT = 30;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  // Rate-Limit: schließt die im Public-Launch-Plan als Fast-Follow notierte
  // Lücke (analyze.js hat keins) -- hier aber nötig, da ein Journal-Prompt
  // (viele Trades auf einmal) teurer ist als die bestehende Einzel-Coin-
  // Analyse. getRedis() kann null sein (Upstash-Env-Vars fehlen) -- dann
  // wird das Limit übersprungen statt die Route zu blockieren, gleiches
  // "optional statt hart erforderlich"-Prinzip wie beim Cron-Job.
  const redis = getRedis();
  if (redis) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `ratelimit:tradesAnalyze:${ctx.user.id}:${today}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 24 * 60 * 60);
    if (count > DAILY_LIMIT) {
      return res.status(429).json({ error: "Tageslimit für KI-Analyse erreicht. Versuch es morgen wieder." });
    }
  }

  const { data, error } = await ctx.supabase
    .from("trades")
    .select("*")
    .eq("user_id", ctx.user.id)
    .order("entry_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const trades = data.map(rowToTrade);
  if (trades.length === 0) {
    return res.status(400).json({ error: "Noch keine Trades erfasst -- leg zuerst welche in deinem Journal an." });
  }

  const stats = summarizeTrades(trades);
  const recentTrades = trades.slice(0, MAX_TRADES_IN_PROMPT).map((t) => {
    const m = computeTradeMetrics(t);
    return `- ${t.symbol} ${t.direction === "long" ? "Long" : "Short"}, Entry ${t.entryPrice}${t.exitPrice != null ? `, Exit ${t.exitPrice}` : " (offen)"}${m.pnlPct != null ? `, PnL ${m.pnlPct >= 0 ? "+" : ""}${m.pnlPct.toFixed(1)}%` : ""}${m.rMultiple != null ? `, ${m.rMultiple >= 0 ? "+" : ""}${m.rMultiple.toFixed(1)}R` : ""}${t.notes ? `, Notiz: "${t.notes}"` : ""}`;
  });

  const prompt = `Du bist ein erfahrener Trading-Coach. Analysiere das folgende Trading-Journal eines Nutzers und gib eine ehrliche, konkrete Einschätzung auf Deutsch.

Statistik (${stats.tradeCount} Trades gesamt, davon ${stats.closedCount} geschlossen, ${stats.openCount} offen):
Trefferquote: ${stats.winRate != null ? `${stats.winRate.toFixed(0)}%` : "n/a"}
Ø-PnL pro geschlossenem Trade: ${stats.avgPnlPct != null ? `${stats.avgPnlPct >= 0 ? "+" : ""}${stats.avgPnlPct.toFixed(1)}%` : "n/a"}
Ø-R-Multiple: ${stats.avgRMultiple != null ? `${stats.avgRMultiple >= 0 ? "+" : ""}${stats.avgRMultiple.toFixed(2)}R` : "n/a"}
Gesamt-PnL: ${stats.totalPnl >= 0 ? "+" : ""}${stats.totalPnl.toFixed(2)} USD

Letzte ${recentTrades.length} Trades:
${recentTrades.join("\n")}

Suche nach Mustern (z.B. wiederkehrende Fehler, bestimmte Symbole/Richtungen die schlechter laufen, Risikomanagement-Probleme wie fehlende Stop-Loss, Hinweise aus den Notizen). Antworte in maximal 5-6 Sätzen. Sei direkt und konkret, keine Allgemeinplätze.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic Fehler (${response.status})`);
    const result = await response.json();
    res.status(200).json({ analysis: result.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
