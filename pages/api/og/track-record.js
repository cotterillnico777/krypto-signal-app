// Dynamisch generiertes Open-Graph-/Twitter-Card-Bild für /track-record --
// liest denselben Redis-Snapshot wie die Seite selbst (siehe
// pages/api/cron/refresh-track-record.js), rendert also immer die
// aktuellen echten Zahlen statt eines statischen Screenshots, der
// veraltet. Edge-Runtime, weil ImageResponse (next/og) das braucht und
// @upstash/redis (fetch-basiert) dort ohnehin problemlos läuft.

import { ImageResponse } from "next/og";
import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

function fmtPct(n) {
  if (n == null) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default async function handler() {
  let snapshot = null;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      snapshot = await redis.get("track-record:snapshot");
    } catch {
      snapshot = null;
    }
  }

  const returnPct = snapshot?.portfolio?.totalReturnPct ?? null;
  const buyHoldPct = snapshot?.portfolio?.buyHoldReturnPct ?? null;
  const maxDrawdown = snapshot?.portfolio?.maxDrawdown ?? null;
  const oosSharpe = snapshot?.walkForward?.avgOosSharpe ?? null;
  const positive = returnPct != null && returnPct >= 0;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 72px",
          background: "#0d0e11",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 700,
              color: "#0d0e11",
              background: "linear-gradient(135deg, #38bdf8, #34d399)",
            }}
          >
            🪙
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: "#f5f5f7" }}>Krypto Signal Dashboard</div>
            <div style={{ fontSize: 22, color: "#9aa0ab" }}>Live-Track-Record</div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ fontSize: 22, color: "#9aa0ab" }}>{`Portfolio-Backtest, ${snapshot?.days ?? 730} Tage, alle ${snapshot?.coins?.length ?? 6} Coins`}</div>
          <div style={{ fontSize: 108, fontWeight: 800, color: positive ? "#34d399" : "#f87171", lineHeight: 1 }}>
            {fmtPct(returnPct)}
          </div>
          <div style={{ fontSize: 24, color: "#c9cdd3" }}>{`vs. Buy&Hold ${fmtPct(buyHoldPct)}`}</div>
        </div>

        <div style={{ display: "flex", gap: 48 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, color: "#9aa0ab" }}>Max Drawdown</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#f87171" }}>{maxDrawdown != null ? `${maxDrawdown.toFixed(1)}%` : "n/a"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 18, color: "#9aa0ab" }}>Ø Out-of-Sample-Sharpe</div>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#f5f5f7" }}>{oosSharpe != null ? oosSharpe.toFixed(2) : "n/a"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ fontSize: 18, color: "#9aa0ab" }}>Echte Zahlen, nichts geschönt</div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
