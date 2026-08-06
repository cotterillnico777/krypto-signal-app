import { useState } from "react";
import Link from "next/link";
import { COINS } from "../lib/marketData";

const PERIODS = [
  { key: 365, label: "1 Jahr" },
  { key: 730, label: "2 Jahre" },
  { key: 1460, label: "4 Jahre" },
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

export default function Optimize() {
  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(730);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch(`/api/optimize?coin=${coinId}&days=${days}`);
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
            <h1>Parameter-Optimierung</h1>
            <p className="subtitle">SMA/RSI/ADX-Raster mit Out-of-Sample-Check gegen Overfitting</p>
          </div>
        </div>
        <div className="header-actions">
          <Link href="/backtest" className="icon-btn">📊 Backtest</Link>
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

      <div className="toast-banner" style={{ marginBottom: "1rem" }}>
        <span className="msg">🔬 Testet automatisch 80 Kombinationen (5 SMA-Paare × 4 RSI-Schwellen × 4 ADX-Filter) auf den ersten 70% des Zeitraums (Training), prüft die Top 5 nach Sharpe Ratio dann auf den letzten 30% (Test) nach. Kann ~10-30s dauern.</span>
      </div>

      <button className="icon-btn primary" onClick={runOptimize} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Optimiere… (kann etwas dauern)" : "🔬 Optimierung starten"}
      </button>

      {error && <div className="error-box">Fehler: {error}</div>}

      {result && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">Trainings-/Test-Split</p>
            <p className="card-value" style={{ fontSize: 16 }}>
              {result.trainDays} Tage Training · {result.testDays} Tage Test (ab {result.splitDate}) · {result.combinationsTestedCount} Kombinationen getestet
            </p>
          </div>

          <div className="card">
            <p className="section-title">Top 5 nach Trainings-Sharpe (mit Out-of-Sample-Vergleich)</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Parameter</th>
                    <th>Train Rendite</th>
                    <th>Train Sharpe</th>
                    <th>Test Rendite</th>
                    <th>Test Sharpe</th>
                    <th>Test Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top.map((r, i) => {
                    const robust = r.test && r.test.sharpe != null && r.train.sharpe != null && r.test.sharpe > 0;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(r.params)}</td>
                        <td><span className={`badge ${r.train.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.train.totalReturnPct)}</span></td>
                        <td>{fmtRatio(r.train.sharpe)}</td>
                        <td><span className={`badge ${r.test?.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.test?.totalReturnPct)}</span></td>
                        <td>
                          {fmtRatio(r.test?.sharpe)}
                          {!robust && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>schwach im Test</span>}
                        </td>
                        <td>{r.test?.tradeCount ?? "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              "Schwach im Test" heißt: die Kombination war im Training gut, hat sich auf ungesehenen Daten aber nicht bestätigt – typisches Overfitting-Warnsignal. Nur Kombinationen, die im Training <strong>und</strong> im Test solide abschneiden, würde ich als robust genug für den echten Backtest mit mehr Optionen (Stop-Loss/Short/Hebel) ansehen.
            </p>
          </div>
        </>
      )}

      <div className="disclaimer">
        Rastersuche über SMA-Perioden, RSI-Schwellen und ADX-Trendfilter mit Trainings-/Test-Split zur Overfitting-Kontrolle.
        Auch robuste Ergebnisse sind keine Garantie für zukünftige Performance – Marktbedingungen ändern sich. Keine Anlageberatung.
      </div>
    </div>
  );
}
