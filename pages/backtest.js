import { useState } from "react";
import Link from "next/link";
import { COINS } from "../lib/marketData";

const PERIODS = [
  { key: 90, label: "90 Tage" },
  { key: 180, label: "180 Tage" },
  { key: 365, label: "365 Tage" },
];

function fmtUSD(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 3 : 0 });
}

function fmtPct(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function EquityChart({ equityCurve }) {
  if (!equityCurve || equityCurve.length < 2) return null;
  const w = 700,
    h = 220,
    pad = 8;
  const all = equityCurve.flatMap((p) => [p.equity, p.buyHoldEquity]);
  const min = Math.min(...all),
    max = Math.max(...all),
    range = max - min || 1;
  const toPoints = (key) =>
    equityCurve
      .map((p, i) => {
        const x = pad + (i / (equityCurve.length - 1)) * (w - pad * 2);
        const y = h - pad - ((p[key] - min) / range) * (h - pad * 2);
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  return (
    <div>
      <div className="chart-legend">
        <span className="legend-item"><span className="dot dot-accent" />Strategie</span>
        <span className="legend-item"><span className="dot dot-muted" />Buy &amp; Hold</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <polyline points={toPoints("buyHoldEquity")} fill="none" stroke="var(--text-faint)" strokeWidth="2" />
        <polyline points={toPoints("equity")} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function Backtest() {
  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(365);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/backtest?coin=${coinId}&days=${days}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">₿</div>
          <div>
            <h1>Backtest</h1>
            <p className="subtitle">Wie hätte die Signal-Strategie historisch performt?</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/" className="icon-btn">← Dashboard</Link>
        </div>
      </header>

      <div className="toolbar">
        <div className="tabs">
          {COINS.map((c) => (
            <button key={c.id} className={coinId === c.id ? "active" : ""} onClick={() => setCoinId(c.id)}>
              {c.symbol}
            </button>
          ))}
        </div>
        <div className="timeframe-group">
          {PERIODS.map((p) => (
            <button key={p.key} className={days === p.key ? "active" : ""} onClick={() => setDays(p.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <button className="icon-btn primary" onClick={runBacktest} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Simuliere…" : "▶ Backtest starten"}
      </button>

      {error && <div className="error-box">Fehler: {error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <p className="card-label">Strategie-Rendite</p>
              <p className="card-value" style={{ color: result.totalReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.totalReturnPct)}
              </p>
              <p className="note">Endkapital: ${fmtUSD(result.finalEquity)} (Start: ${fmtUSD(result.startingCash)})</p>
            </div>
            <div className="card">
              <p className="card-label">Buy &amp; Hold Rendite</p>
              <p className="card-value" style={{ color: result.buyHoldReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.buyHoldReturnPct)}
              </p>
              <p className="note">Einfach kaufen &amp; halten, zum Vergleich</p>
            </div>
            <div className="card">
              <p className="card-label">Max Drawdown</p>
              <p className="card-value">{result.maxDrawdown.toFixed(1)}%</p>
              <p className="note">Größter Rückgang vom Höchststand</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">Anzahl Trades</p>
              <p className="card-value">{result.tradeCount}</p>
            </div>
            <div className="card">
              <p className="card-label">Trefferquote</p>
              <p className="card-value">{result.winRate === null ? "n/a" : `${result.winRate.toFixed(0)}%`}</p>
            </div>
            <div className="card">
              <p className="card-label">Coin / Zeitraum</p>
              <p className="card-value">{result.coin.symbol} · {result.days}T</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="section-title">Equity-Kurve</p>
            <EquityChart equityCurve={result.equityCurve} />
          </div>

          <div className="card">
            <p className="section-title">Trades ({result.tradeCount})</p>
            {result.tradeCount === 0 ? (
              <p className="note">Keine Kaufsignale im gewählten Zeitraum ausgelöst.</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Kauf</th>
                      <th>Kauf-Preis</th>
                      <th>Verkauf</th>
                      <th>Verkauf-Preis</th>
                      <th>Rendite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i}>
                        <td>{t.entryDate}</td>
                        <td>${fmtUSD(t.entryPrice)}</td>
                        <td>{t.exitDate}{t.openAtEnd ? " (offen)" : ""}</td>
                        <td>${fmtUSD(t.exitPrice)}</td>
                        <td>
                          <span className={`badge ${t.returnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(t.returnPct)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      <div className="disclaimer">
        Historische Simulation der Dashboard-Signale (SMA + RSI + MACD + Volumen + Makro + Fear &amp; Greed), Start-Kapital $10.000, keine Gebühren/Slippage berücksichtigt.
        Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.
      </div>
    </div>
  );
}
