import { useState } from "react";
import Link from "next/link";
import { COINS } from "../lib/marketData";

const PERIODS = [
  { key: 730, label: "2 Jahre" },
  { key: 1460, label: "4 Jahre" },
  { key: 2920, label: "8 Jahre" },
];

const COSTS = [
  { key: 0, label: "0% (unrealistisch)" },
  { key: 0.15, label: "0,15% (Standard)" },
  { key: 0.3, label: "0,3% (konservativ)" },
];

function fmtPct(n) {
  if (n == null) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtRatio(n) {
  return n == null ? "n/a" : n.toFixed(2);
}

function paramsLabel(p) {
  return `SMA ${p.smaFast}/${p.smaSlow} · RSI ${p.rsiBuyThreshold}/${p.rsiSellThreshold} · ADX ${p.adxThreshold ?? "aus"}`;
}

export default function WalkForward() {
  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(1460);
  const [costPct, setCostPct] = useState(0.15);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runWalkForward() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/walkforward?coin=${coinId}&days=${days}&cost=${costPct}`);
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
            <h1>Walk-Forward-Validierung</h1>
            <p className="subtitle">Mehrere versetzte Trainings-/Test-Fenster statt nur einem</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/optimize" className="icon-btn">🔬 Optimierung</Link>
          <Link href="/backtest" className="icon-btn">📊 Backtest</Link>
          <Link href="/portfolio" className="icon-btn">💼 Portfolio</Link>
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
        <span className="note-label" style={{ fontSize: 12.5 }}>Handelskosten</span>
        <div className="tabs">
          {COSTS.map((c) => (
            <button key={c.key} className={costPct === c.key ? "active" : ""} onClick={() => setCostPct(c.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toast-banner" style={{ marginBottom: "1rem" }}>
        <span className="msg">
          📈 Teilt den Zeitraum in 5 aufeinanderfolgende Segmente. Pro Fold wird auf allen Segmenten bis dahin (wachsendes Trainingsfenster) die beste Kombination aus 80 gesucht und direkt auf dem nächsten, ungesehenen Segment getestet – simuliert, wie ein regelmäßiges Neu-Optimieren in der Praxis abgeschnitten hätte. Kann ~20-60s dauern.
        </span>
      </div>

      <button className="icon-btn primary" onClick={runWalkForward} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Validiere… (kann etwas dauern)" : "📈 Walk-Forward starten"}
      </button>

      {error && <div className="error-box">Fehler: {error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">Ø Out-of-Sample-Rendite</p>
              <p className="card-value" style={{ color: result.avgOosReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.avgOosReturnPct)}
              </p>
              <p className="note">Durchschnitt über alle {result.foldCount} Test-Fenster</p>
            </div>
            <div className="card">
              <p className="card-label">Ø Out-of-Sample-Sharpe</p>
              <p className="card-value">{fmtRatio(result.avgOosSharpe)}</p>
              <p className="note">Risikoadjustiert, annualisiert</p>
            </div>
            <div className="card">
              <p className="card-label">Profitable Folds</p>
              <p className="card-value">{result.profitableFolds}/{result.foldCount}</p>
              <p className="note">Wie oft war das Test-Fenster positiv?</p>
            </div>
          </div>

          <div className="card">
            <p className="section-title">Folds im Detail</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Fold</th>
                    <th>Training (Tage)</th>
                    <th>Test-Zeitraum</th>
                    <th>Gewählte Parameter</th>
                    <th>Train Sharpe</th>
                    <th>Test Rendite</th>
                    <th>Test Sharpe</th>
                  </tr>
                </thead>
                <tbody>
                  {result.folds.map((f) => (
                    <tr key={f.fold}>
                      <td>{f.fold}</td>
                      <td>{f.trainDays}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{f.testStart} → {f.testEnd}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(f.params)}</td>
                      <td>{fmtRatio(f.train.sharpe)}</td>
                      <td><span className={`badge ${f.test.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(f.test.totalReturnPct)}</span></td>
                      <td>{fmtRatio(f.test.sharpe)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              Jeder Fold wählt unabhängig die im jeweiligen Trainingsfenster beste Kombination (nach Sharpe) und testet sie sofort auf dem nächsten Segment. Wechseln die gewählten Parameter stark von Fold zu Fold, ist das ein Hinweis, dass es keine stabile Kante gibt, sondern die "beste" Kombination stark vom Marktregime abhängt. Erst wenn die Ø Out-of-Sample-Werte über mehrere Folds hinweg konsistent positiv sind, würde ich das als robusteren Hinweis auf echten Vorteil werten als einen einzelnen Train/Test-Split.
            </p>
          </div>
        </>
      )}

      <div className="disclaimer">
        Walk-Forward-Validierung mit 4 rollierenden Test-Fenstern (5 Segmente, wachsendes Trainingsfenster), SMA/RSI/ADX-Rastersuche pro Fold. Handelskosten (Fee + Slippage) fließen standardmäßig mit 0,15% je Seite ein.
        Auch konsistent positive Ergebnisse sind keine Garantie für zukünftige Performance. Keine Anlageberatung.
      </div>
    </div>
  );
}
