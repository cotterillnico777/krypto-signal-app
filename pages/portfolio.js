import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

const PERIODS = [
  { key: 365, label: "1 Jahr" },
  { key: 730, label: "2 Jahre" },
  { key: 1460, label: "4 Jahre" },
  { key: 2920, label: "8 Jahre" },
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
];

const COSTS = [
  { key: 0, label: "0% (unrealistisch)" },
  { key: 0.15, label: "0,15% (Standard)" },
  { key: 0.3, label: "0,3% (konservativ)" },
];

function fmtUSD(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 3 : 0 });
}

function fmtPct(n) {
  if (n == null) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtRatio(n) {
  return n == null ? "n/a" : n.toFixed(2);
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
        <span className="legend-item"><span className="dot dot-accent" />Portfolio</span>
        <span className="legend-item"><span className="dot dot-muted" />Buy &amp; Hold (alle 5, gleichgewichtet)</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <polyline points={toPoints("buyHoldEquity")} fill="none" stroke="var(--text-faint)" strokeWidth="2" />
        <polyline points={toPoints("equity")} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function Portfolio({ user, access }) {
  const [days, setDays] = useState(730);
  const [stopLoss, setStopLoss] = useState(null);
  const [allowShort, setAllowShort] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [costPct, setCostPct] = useState(0.15);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runPortfolio() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const stopParam = stopLoss ? `&stopLoss=${stopLoss}` : "";
      const shortParam = allowShort ? "&short=1" : "";
      const leverageParam = leverage !== 1 ? `&leverage=${leverage}` : "";
      const costParam = `&cost=${costPct}`;
      const res = await fetch(`/api/portfolio?days=${days}${stopParam}${shortParam}${leverageParam}${costParam}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const avgCoinMaxDrawdown = result ? result.perCoin.reduce((a, c) => a + c.maxDrawdown, 0) / result.perCoin.length : null;
  const avgCoinSharpe = result
    ? (() => {
        const s = result.perCoin.map((c) => c.sharpe).filter((v) => v != null);
        return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
      })()
    : null;
  const avgTradesPerCoin = result ? result.perCoin.reduce((a, c) => a + c.tradeCount, 0) / result.perCoin.length : null;
  const lowSampleSize = avgTradesPerCoin != null && avgTradesPerCoin < 3;

  return (
    <div className="container">
      <AppHeader
        title="Portfolio-Backtest"
        subtitle="Echte Kapitalaufteilung über alle 5 Coins gleichzeitig"
        active="portfolio"
        user={user}
        access={access}
      />

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>Zeitraum</span>
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
          💼 Verteilt $10.000 gleichmäßig auf BTC, ETH, SOL, XRP, TAO ($2.000 je Coin) und lässt jeden mit der Dashboard-Signal-Strategie unabhängig handeln – kein Rebalancing zwischen den Coins. Zeigt, ob die Streuung über mehrere Coins den Drawdown/Sharpe im Vergleich zu den Einzelcoins verbessert.
        </span>
      </div>

      <button className="icon-btn primary" onClick={runPortfolio} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? "Simuliere…" : "▶ Portfolio-Backtest starten"}
      </button>

      {error && <div className="error-box">Fehler: {error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <p className="card-label">Portfolio-Rendite</p>
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
              <p className="note">Alle 5 Coins gleichgewichtet kaufen &amp; halten</p>
            </div>
            <div className="card">
              <p className="card-label">Portfolio Max Drawdown</p>
              <p className="card-value">{result.maxDrawdown.toFixed(1)}%</p>
              <p className="note">Ø Einzelcoins: {avgCoinMaxDrawdown.toFixed(1)}%{result.maxDrawdown < avgCoinMaxDrawdown ? " · Diversifikation hilft" : ""}</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">Anzahl Trades (gesamt)</p>
              <p className="card-value">{result.tradeCount}</p>
              <p className="note">
                Ø {avgTradesPerCoin.toFixed(1)} je Coin
                {lowSampleSize && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>geringe Stichprobe</span>}
              </p>
            </div>
            <div className="card">
              <p className="card-label">Portfolio Sharpe / Sortino</p>
              <p className="card-value" style={{ fontSize: 18 }}>{fmtRatio(result.sharpe)} / {fmtRatio(result.sortino)}</p>
              <p className="note">Ø Einzelcoins Sharpe: {fmtRatio(avgCoinSharpe)}</p>
            </div>
            <div className="card">
              <p className="card-label">Zeitraum / Hebel / Kosten</p>
              <p className="card-value" style={{ fontSize: 16 }}>{result.days}T · {result.stopLossPct ? `-${result.stopLossPct}%` : "kein Stop"} · {result.leverage}x{result.allowShort ? " · Short erlaubt" : ""} · {result.costPct}%</p>
              {result.days < result.requestedDays && (
                <p className="note">Verkürzt von {result.requestedDays}T, da mind. ein Coin (z.B. TAO) kürzer gelistet ist.</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="section-title">Portfolio-Equity-Kurve</p>
            <EquityChart equityCurve={result.equityCurve} />
          </div>

          <div className="card">
            <p className="section-title">Pro Coin (je ${fmtUSD(result.perCoin[0]?.allocatedCash)} Startkapital)</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Coin</th>
                    <th>Rendite</th>
                    <th>Max Drawdown</th>
                    <th>Sharpe</th>
                    <th>Sortino</th>
                    <th>Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {result.perCoin.map((c) => (
                    <tr key={c.coinId}>
                      <td>{c.symbol}</td>
                      <td><span className={`badge ${c.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(c.totalReturnPct)}</span></td>
                      <td>{c.maxDrawdown.toFixed(1)}%</td>
                      <td>{fmtRatio(c.sharpe)}</td>
                      <td>{fmtRatio(c.sortino)}</td>
                      <td>{c.tradeCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="note" style={{ marginTop: 12 }}>
              Diversifikationseffekt: Der Portfolio-Max-Drawdown ({result.maxDrawdown.toFixed(1)}%) im Vergleich zum Durchschnitt der Einzelcoins ({avgCoinMaxDrawdown.toFixed(1)}%) zeigt, ob unkorrelierte Bewegungen zwischen den Coins die Schwankungen im Vergleich zu einer Einzelcoin-Position abfedern. Da alle 5 Coins derselben Signal-Logik folgen und Krypto-Assets tendenziell stark korrelieren, ist der Effekt oft kleiner als bei klassischen Multi-Asset-Portfolios (Aktien/Anleihen/Rohstoffe) – aber selten null.
              {lowSampleSize && (
                <> Mit Ø {avgTradesPerCoin.toFixed(1)} Trades je Coin in diesem Lauf ist das Ergebnis allerdings eher eine Summe weniger dominanter Einzelwetten als ein statistisch belastbarer Beleg für echte Diversifikation – für ein verlässlicheres Bild einen längeren Zeitraum wählen oder mehrere Zeiträume vergleichen.</>
              )}
            </p>
          </div>
        </>
      )}

      <div className="disclaimer">
        Portfolio-Backtest: $10.000 gleichmäßig auf BTC/ETH/SOL/XRP/TAO verteilt, jeder Coin handelt unabhängig nach der Dashboard-Signal-Strategie (SMA + RSI + MACD + Volumen + Makro + Fear &amp; Greed), kein Rebalancing zwischen den Coins über die Zeit. Handelskosten (Fee + Slippage) mit 0,15% je Seite standardmäßig aktiv, auch beim Buy&amp;Hold-Vergleich.
        Der gemeinsame Betrachtungszeitraum richtet sich nach dem am kürzesten gelisteten Coin.
        <br /><br />
        <strong>Zwei Einschränkungen, die die Aussagekraft begrenzen:</strong> Alle 5 Coins handeln mit denselben Standard-Parametern statt je Coin optimierten Werten (siehe "🔬 Optimierung"), und es ist ein einzelner statischer Lauf ohne Trainings-/Test-Split oder Walk-Forward-Check. Bei kurzen/mittleren Zeiträumen kann jeder Coin nur 1-2 Trades ausführen – dann ist das "Portfolio" im Kern eine Summe weniger dominanter Einzelwetten, keine statistisch robuste Stichprobe.
        <br /><br />
        Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.
      </div>
    </div>
  );
}
