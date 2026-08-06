import { useState } from "react";
import Link from "next/link";
import { COINS } from "../lib/marketData";

const PERIODS = [
  { key: 90, label: "90 Tage" },
  { key: 365, label: "1 Jahr" },
  { key: 730, label: "2 Jahre" },
  { key: 1460, label: "4 Jahre" },
];

const STOP_LOSSES = [
  { key: null, label: "Kein Stop" },
  { key: 10, label: "-10%" },
  { key: 15, label: "-15%" },
  { key: 20, label: "-20%" },
];

const LEVERAGES = [
  { key: 1, label: "1x (kein Hebel)" },
  { key: 2, label: "2x" },
  { key: 3, label: "3x" },
  { key: 5, label: "5x" },
  { key: 10, label: "10x" },
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
  const [stopLoss, setStopLoss] = useState(null);
  const [allowShort, setAllowShort] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const stopParam = stopLoss ? `&stopLoss=${stopLoss}` : "";
      const shortParam = allowShort ? "&short=1" : "";
      const leverageParam = leverage !== 1 ? `&leverage=${leverage}` : "";
      const res = await fetch(`/api/backtest?coin=${coinId}&days=${days}${stopParam}${shortParam}${leverageParam}`);
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
          <Link href="/optimize" className="icon-btn">🔬 Optimierung</Link>
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

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>Stop-Loss</span>
        <div className="tabs">
          {STOP_LOSSES.map((s) => (
            <button key={s.label} className={stopLoss === s.key ? "active" : ""} onClick={() => setStopLoss(s.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>Richtung</span>
        <div className="tabs">
          <button className={!allowShort ? "active" : ""} onClick={() => setAllowShort(false)} style={{ padding: "5px 10px", fontSize: 12 }}>Nur Long</button>
          <button className={allowShort ? "active" : ""} onClick={() => setAllowShort(true)} style={{ padding: "5px 10px", fontSize: 12 }}>Long + Short</button>
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>Hebel</span>
        <div className="tabs">
          {LEVERAGES.map((l) => (
            <button key={l.key} className={leverage === l.key ? "active" : ""} onClick={() => setLeverage(l.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {leverage > 1 && (
        <div className="toast-banner" style={{ marginBottom: "1rem" }}>
          <span className="msg">⚠️ Bei Hebel {leverage}x wird die Position liquidiert (Totalverlust der Margin), wenn sich der Kurs um {(100 / leverage).toFixed(1)}% gegen dich bewegt. Funding-Kosten (echte historische Binance-Perpetual-Rates) fließen mit ein.</span>
        </div>
      )}

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
              {result.liquidationCount > 0 && <p className="note">davon {result.liquidationCount} liquidiert</p>}
            </div>
            <div className="card">
              <p className="card-label">Trefferquote</p>
              <p className="card-value">{result.winRate === null ? "n/a" : `${result.winRate.toFixed(0)}%`}</p>
            </div>
            <div className="card">
              <p className="card-label">Sharpe / Sortino</p>
              <p className="card-value" style={{ fontSize: 18 }}>{result.sharpe === null ? "n/a" : result.sharpe.toFixed(2)} / {result.sortino === null ? "n/a" : result.sortino.toFixed(2)}</p>
              <p className="note">Rendite pro Risikoeinheit (annualisiert)</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">Coin / Zeitraum / Stop / Hebel</p>
            <p className="card-value" style={{ fontSize: 16 }}>{result.coin.symbol} · {result.days}T · {result.stopLossPct ? `-${result.stopLossPct}%` : "kein Stop"} · {result.leverage}x{result.allowShort ? " · Short erlaubt" : ""}</p>
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
                      <th>Richtung</th>
                      <th>Einstieg</th>
                      <th>Einstiegs-Preis</th>
                      <th>Ausstieg</th>
                      <th>Ausstiegs-Preis</th>
                      <th>Rendite</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((t, i) => (
                      <tr key={i}>
                        <td><span className={`badge ${t.direction === "short" ? "badge-red" : "badge-green"}`}>{t.direction === "short" ? "Short" : "Long"}</span></td>
                        <td>{t.entryDate}</td>
                        <td>${fmtUSD(t.entryPrice)}</td>
                        <td>{t.exitDate}{t.openAtEnd ? " (offen)" : ""}{t.stoppedOut ? " (Stop)" : ""}{t.liquidated ? " (liquidiert)" : ""}</td>
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
        Historische Simulation der Dashboard-Signale (SMA + RSI + MACD + Volumen + Makro + Fear &amp; Greed), Start-Kapital $10.000, keine Handelsgebühren/Slippage berücksichtigt.
        Bei Hebel &gt;1x oder Short-Positionen werden echte historische Funding-Rates von Binance-Perpetuals einbezogen und eine Liquidierungsschwelle simuliert – trotzdem eine vereinfachte Annahme, echter Hebelhandel ist riskanter als hier abgebildet.
        Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.
      </div>
    </div>
  );
}
