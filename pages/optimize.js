import { useState } from "react";
import Link from "next/link";
import { COINS } from "../lib/marketData";

const PERIODS = [
  { key: 365, label: "1 Jahr" },
  { key: 730, label: "2 Jahre" },
  { key: 1460, label: "4 Jahre" },
  { key: 2920, label: "8 Jahre" },
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

function perCoinLabel(perCoin) {
  return perCoin.map((c) => `${c.symbol} ${fmtPct(c.totalReturnPct)}`).join(" · ");
}

export default function Optimize() {
  const [mode, setMode] = useState("single");
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
      const modeParam = mode === "multi" ? "&mode=multi" : `&coin=${coinId}`;
      const res = await fetch(`/api/optimize?days=${days}${modeParam}`);
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
        <span className="note-label" style={{ fontSize: 12.5 }}>Modus</span>
        <div className="tabs">
          <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")} style={{ padding: "5px 10px", fontSize: 12 }}>1 Coin</button>
          <button className={mode === "multi" ? "active" : ""} onClick={() => setMode("multi")} style={{ padding: "5px 10px", fontSize: 12 }}>Alle 5 Coins</button>
        </div>
      </div>

      <div className="toolbar">
        {mode === "single" && (
          <div className="tabs">
            {COINS.map((c) => (
              <button key={c.id} className={coinId === c.id ? "active" : ""} onClick={() => setCoinId(c.id)}>
                {c.symbol}
              </button>
            ))}
          </div>
        )}
        <div className="timeframe-group">
          {PERIODS.map((p) => (
            <button key={p.key} className={days === p.key ? "active" : ""} onClick={() => setDays(p.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toast-banner" style={{ marginBottom: "1rem" }}>
        <span className="msg">
          🔬 {mode === "multi"
            ? "Testet 80 Kombinationen über alle 5 Coins gleichzeitig und rankt nach durchschnittlichem Sharpe – eine Kombination, die nur bei einem Coin gut aussieht, fällt im Schnitt durch. Dauert länger (~30-60s)."
            : "Testet automatisch 80 Kombinationen (5 SMA-Paare × 4 RSI-Schwellen × 4 ADX-Filter) auf den ersten 70% des Zeitraums (Training), prüft die Top 5 nach Sharpe Ratio dann auf den letzten 30% (Test) nach. Kann ~10-30s dauern."}
        </span>
      </div>

      <button className="icon-btn primary" onClick={runOptimize} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Optimiere… (kann etwas dauern)" : "🔬 Optimierung starten"}
      </button>

      {error && <div className="error-box">Fehler: {error}</div>}

      {result && mode === "single" && (
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

      {result && mode === "multi" && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">Trainings-/Test-Split · Coins</p>
            <p className="card-value" style={{ fontSize: 16 }}>
              {result.trainDays} Tage Training · {result.testDays} Tage Test · {result.combinationsTestedCount} Kombinationen × {result.coins.length} Coins ({result.coins.join(", ")})
            </p>
          </div>

          <div className="card">
            <p className="section-title">Top 5 nach durchschnittlichem Trainings-Sharpe (über alle Coins)</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Parameter</th>
                    <th>Train Ø-Rendite</th>
                    <th>Train Ø-Sharpe</th>
                    <th>Train Konsistenz</th>
                    <th>Test Ø-Rendite</th>
                    <th>Test Ø-Sharpe</th>
                    <th>Test Konsistenz</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top.map((r, i) => {
                    const robust = r.test && r.test.avgSharpe != null && r.test.avgSharpe > 0 && r.test.positiveCoinCount >= 3;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(r.params)}</td>
                        <td><span className={`badge ${r.train.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.train.avgReturnPct)}</span></td>
                        <td>{fmtRatio(r.train.avgSharpe)}</td>
                        <td>{r.train.positiveCoinCount}/{r.train.totalCoinCount} positiv</td>
                        <td><span className={`badge ${r.test?.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.test?.avgReturnPct)}</span></td>
                        <td>
                          {fmtRatio(r.test?.avgSharpe)}
                          {!robust && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>schwach im Test</span>}
                        </td>
                        <td>{r.test ? `${r.test.positiveCoinCount}/${r.test.totalCoinCount} positiv` : "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16 }}>
              {result.top.map((r, i) => (
                <p key={i} className="note" style={{ marginTop: 6 }}>
                  <span className="note-label">#{i + 1} Test je Coin:</span> {r.test ? perCoinLabel(r.test.perCoin) : "n/a"}
                </p>
              ))}
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              "Konsistenz" zählt, bei wie vielen der 5 Coins die Kombination eine positive Rendite lieferte. Eine Kombination mit hohem Ø-Sharpe aber niedriger Konsistenz wird meist nur von einem einzelnen Ausreißer-Coin getragen – weniger überzeugend als eine, die über mehrere Coins hinweg konsistent funktioniert.
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
