import { useState } from "react";
import { COINS } from "../lib/marketData";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

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

function perCoinLabel(perCoin) {
  return perCoin.map((c) => `${c.symbol} ${fmtPct(c.totalReturnPct)}`).join(" · ");
}

export default function WalkForward({ user, access }) {
  const [mode, setMode] = useState("single");
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
      const modeParam = mode === "multi" ? "&mode=multi" : `&coin=${coinId}`;
      const res = await fetch(`/api/walkforward?days=${days}${modeParam}&cost=${costPct}`);
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
      <AppHeader
        title="Walk-Forward-Validierung"
        subtitle="Mehrere versetzte Trainings-/Test-Fenster statt nur einem"
        active="walkforward"
        user={user}
        access={access}
      />

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
          📈 Teilt den Zeitraum in 5 aufeinanderfolgende Segmente. Pro Fold wird auf allen Segmenten bis dahin (wachsendes Trainingsfenster) die beste Kombination aus 80 gesucht und direkt auf dem nächsten, ungesehenen Segment getestet – simuliert, wie ein regelmäßiges Neu-Optimieren in der Praxis abgeschnitten hätte.
          {mode === "multi" ? " Im Multi-Coin-Modus wird die Kombination pro Fold über alle 5 Coins gleichzeitig gerankt (Ø-Sharpe) – kombiniert die beiden strengsten Overfitting-Checks." : ""}
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
              <p className="note">Durchschnitt über alle {result.foldCount} Test-Fenster{mode === "multi" ? " (Ø über 5 Coins)" : ""}</p>
            </div>
            <div className="card">
              <p className="card-label">Ø Out-of-Sample-Sharpe</p>
              <p className="card-value">{fmtRatio(result.avgOosSharpe)}</p>
              <p className="note">Risikoadjustiert, annualisiert</p>
            </div>
            <div className="card">
              <p className="card-label">Profitable Folds</p>
              <p className="card-value">{result.profitableFolds}/{result.foldCount}</p>
              <p className="note">{mode === "multi" ? "Wie oft war die Ø-Rendite über alle Coins positiv?" : "Wie oft war das Test-Fenster positiv?"}</p>
            </div>
          </div>

          {mode === "multi" && result.days < result.requestedDays && (
            <div className="toast-banner" style={{ marginBottom: "1.5rem" }}>
              <span className="msg">Gemeinsamer Zeitraum verkürzt von {result.requestedDays}T auf {result.days}T, da mind. ein Coin (z.B. TAO) kürzer gelistet ist.</span>
            </div>
          )}

          {mode === "single" && (
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
          )}

          {mode === "multi" && (
            <div className="card">
              <p className="section-title">Folds im Detail (über alle 5 Coins gerankt)</p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fold</th>
                      <th>Training (Tage)</th>
                      <th>Test-Zeitraum</th>
                      <th>Gewählte Parameter</th>
                      <th>Train Ø-Sharpe</th>
                      <th>Test Ø-Rendite</th>
                      <th>Test Ø-Sharpe</th>
                      <th>Test Konsistenz</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.folds.map((f) => (
                      <tr key={f.fold}>
                        <td>{f.fold}</td>
                        <td>{f.trainDays}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{f.testStart} → {f.testEnd}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(f.params)}</td>
                        <td>{fmtRatio(f.train.avgSharpe)}</td>
                        <td><span className={`badge ${f.test.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(f.test.avgReturnPct)}</span></td>
                        <td>{fmtRatio(f.test.avgSharpe)}</td>
                        <td>{f.test.positiveCoinCount}/{f.test.totalCoinCount} positiv</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16 }}>
                {result.folds.map((f) => (
                  <p key={f.fold} className="note" style={{ marginTop: 6 }}>
                    <span className="note-label">Fold {f.fold} Test je Coin:</span> {perCoinLabel(f.test.perCoin)}
                  </p>
                ))}
              </div>
              <p className="note" style={{ marginTop: 12 }}>
                Kombiniert die beiden strengsten Overfitting-Checks: pro Fold wird die Parameter-Kombination über alle 5 Coins gleichzeitig gerankt (nicht nur eine, die zufällig zu einem einzelnen Coin passt), UND über 4 zeitlich versetzte Test-Fenster geprüft (nicht nur ein einzelner Split). "Konsistenz" zeigt, bei wie vielen Coins der Fold im Test positiv war – niedrige Konsistenz trotz positiver Ø-Rendite bedeutet, dass ein einzelner Ausreißer-Coin das Ergebnis trägt.
              </p>
            </div>
          )}
        </>
      )}

      <div className="disclaimer">
        Walk-Forward-Validierung mit 4 rollierenden Test-Fenstern (5 Segmente, wachsendes Trainingsfenster), SMA/RSI/ADX-Rastersuche pro Fold. Handelskosten (Fee + Slippage) fließen standardmäßig mit 0,15% je Seite ein.
        Auch konsistent positive Ergebnisse sind keine Garantie für zukünftige Performance. Keine Anlageberatung.
      </div>
    </div>
  );
}
