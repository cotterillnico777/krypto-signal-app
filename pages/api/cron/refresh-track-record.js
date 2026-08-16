// Läuft täglich per Vercel Cron (siehe vercel.json). Berechnet einen
// aktuellen "Live-Track-Record"-Snapshot (Portfolio-Backtest +
// Multi-Coin-Walk-Forward, Standardeinstellungen, 730 Tage) und cached ihn
// in Redis -- die öffentliche Seite pages/track-record.js liest NUR aus
// dem Cache, berechnet nie live bei einem Seitenaufruf. Bewusst so gebaut:
// eine öffentliche, nicht eingeloggte Seite, die bei jedem Besuch einen
// mehrere-Sekunden-Multi-Coin-Backtest auslöst, wäre ein Kosten-/
// Abuse-Risiko (Binance/FRED-Rate-Limits, Vercel-Function-Dauer).

import { getRedis } from "../../../lib/redis";
import { COINS, fetchHistoricalSeries, fetchMacroData, fetchFearGreedData } from "../../../lib/marketData";
import { runPortfolioBacktest } from "../../../lib/backtest";
import { runMultiCoinWalkForward } from "../../../lib/optimizer";

export const config = { maxDuration: 30 };

const DAYS = 730; // 2 Jahre -- gleicher Zeitraum, den /validation und die Parameter-Tipps als Standard-Referenzfenster nutzen
const CACHE_KEY = "track-record:snapshot";
const CACHE_TTL_SECONDS = 3 * 24 * 60 * 60; // 3 Tage Puffer, falls ein täglicher Lauf mal ausfällt

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

  const redis = getRedis();
  if (!redis) return res.status(500).json({ error: "UPSTASH_REDIS_REST_URL/TOKEN fehlt." });

  try {
    const [macro, fg, seriesPerCoin] = await Promise.all([
      fetchMacroData(Math.ceil(DAYS / 30) + 20, DAYS + 120),
      fetchFearGreedData(Math.min(DAYS + 60, 3500)).catch(() => ({ history: [] })),
      Promise.all(COINS.map(async (coin) => ({ coin, series: await fetchHistoricalSeries(coin.id, DAYS) }))),
    ]);

    const coinDatasets = seriesPerCoin
      .filter(({ series }) => series.prices.length >= 40)
      .map(({ coin, series }) => ({
        coinId: coin.id,
        symbol: coin.symbol,
        prices: series.prices.map((p) => p.v),
        highs: series.highs.map((h) => h.v),
        lows: series.lows.map((l) => l.v),
        volumes: series.volumes.map((v) => v.v),
        dates: series.prices.map((p) => p.t),
      }));

    const portfolio = runPortfolioBacktest({ coinDatasets, macro, fearGreedHistory: fg.history });
    const walkForward = runMultiCoinWalkForward({ coinDatasets, macro, fearGreedHistory: fg.history });

    const snapshot = {
      computedAt: new Date().toISOString(),
      days: DAYS,
      coins: coinDatasets.map((c) => c.symbol),
      portfolio: {
        totalReturnPct: portfolio.totalReturnPct,
        buyHoldReturnPct: portfolio.buyHoldReturnPct,
        maxDrawdown: portfolio.maxDrawdown,
        sharpe: portfolio.sharpe,
        tradeCount: portfolio.tradeCount,
      },
      walkForward: {
        avgOosReturnPct: walkForward.avgOosReturnPct,
        avgOosSharpe: walkForward.avgOosSharpe,
        profitableFolds: walkForward.profitableFolds,
        foldCount: walkForward.foldCount,
      },
    };

    await redis.set(CACHE_KEY, snapshot, { ex: CACHE_TTL_SECONDS });

    res.status(200).json({ ok: true, snapshot });
  } catch (err) {
    res.status(500).json({ error: err.message || "Track-Record-Snapshot fehlgeschlagen." });
  }
}
