import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { COINS } from "../lib/marketData";
import { useLanguage } from "../lib/i18n";

const COIN_SYMBOLS = COINS.map((c) => c.symbol).join(", ");
const PER_COIN_CASH = Math.round(10000 / COINS.length);

export const getServerSideProps = requireActiveAccess;

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

function EquityChart({ equityCurve, t }) {
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
        <span className="legend-item"><span className="dot dot-accent" />{t("tools.portfolio.legendPortfolio")}</span>
        <span className="legend-item"><span className="dot dot-muted" />{t("tools.portfolio.legendBuyHold", { count: COINS.length })}</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <polyline points={toPoints("buyHoldEquity")} fill="none" stroke="var(--text-faint)" strokeWidth="2" />
        <polyline points={toPoints("equity")} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function Portfolio({ user, access }) {
  const { t } = useLanguage();
  const PERIODS = [
    { key: 365, label: t("tools.shared.p365") },
    { key: 730, label: t("tools.shared.p730") },
    { key: 1460, label: t("tools.shared.p1460") },
    { key: 2920, label: t("tools.shared.p2920") },
  ];
  const STOP_LOSSES = [
    { key: null, label: t("tools.shared.stopLossNone") },
    { key: 10, label: "-10%" },
    { key: 15, label: "-15%" },
    { key: 20, label: "-20%" },
  ];
  const LEVERAGES = [
    { key: 1, label: t("tools.shared.leverageNone") },
    { key: 2, label: "2x" },
    { key: 3, label: "3x" },
    { key: 5, label: "5x" },
  ];
  const COSTS = [
    { key: 0, label: t("tools.shared.cost0") },
    { key: 0.15, label: t("tools.shared.cost15") },
    { key: 0.3, label: t("tools.shared.cost30") },
  ];

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
        title={t("tools.portfolio.title")}
        subtitle={t("tools.portfolio.subtitle", { count: COINS.length })}
        active="portfolio"
        user={user}
        access={access}
      />

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.period")}</span>
        <div className="timeframe-group">
          {PERIODS.map((p) => (
            <button key={p.key} className={days === p.key ? "active" : ""} onClick={() => setDays(p.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.stopLossLabel")}</span>
        <div className="tabs">
          {STOP_LOSSES.map((s) => (
            <button key={s.label} className={stopLoss === s.key ? "active" : ""} onClick={() => setStopLoss(s.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.direction")}</span>
        <div className="tabs">
          <button className={!allowShort ? "active" : ""} onClick={() => setAllowShort(false)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("tools.shared.longOnly")}</button>
          <button className={allowShort ? "active" : ""} onClick={() => setAllowShort(true)} style={{ padding: "5px 10px", fontSize: 12 }}>{t("tools.shared.longShort")}</button>
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.leverage")}</span>
        <div className="tabs">
          {LEVERAGES.map((l) => (
            <button key={l.key} className={leverage === l.key ? "active" : ""} onClick={() => setLeverage(l.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.costsLabel")}</span>
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
          {t("tools.portfolio.banner", { symbols: COIN_SYMBOLS, perCoin: PER_COIN_CASH.toLocaleString("de-DE") })}
        </span>
      </div>

      <button className="icon-btn primary" onClick={runPortfolio} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? t("tools.shared.simulating") : t("tools.portfolio.start")}
      </button>

      {error && <div className="error-box">{t("tools.shared.errorPrefix")}{error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <p className="card-label">{t("tools.portfolio.portfolioReturn")}</p>
              <p className="card-value" style={{ color: result.totalReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.totalReturnPct)}
              </p>
              <p className="note">{t("tools.shared.finalCapital", { final: fmtUSD(result.finalEquity), start: fmtUSD(result.startingCash) })}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.shared.buyHoldReturn")}</p>
              <p className="card-value" style={{ color: result.buyHoldReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.buyHoldReturnPct)}
              </p>
              <p className="note">{t("tools.portfolio.buyHoldNoteAll", { count: COINS.length })}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.portfolio.portfolioMaxDrawdown")}</p>
              <p className="card-value">{result.maxDrawdown.toFixed(1)}%</p>
              <p className="note">{t("tools.portfolio.avgCoinsDrawdown", { pct: avgCoinMaxDrawdown.toFixed(1) })}{result.maxDrawdown < avgCoinMaxDrawdown ? t("tools.portfolio.diversificationHelps") : ""}</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">{t("tools.portfolio.tradeCountTotal")}</p>
              <p className="card-value">{result.tradeCount}</p>
              <p className="note">
                {t("tools.portfolio.avgPerCoin", { avg: avgTradesPerCoin.toFixed(1) })}
                {lowSampleSize && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>{t("tools.shared.lowSample")}</span>}
              </p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.portfolio.portfolioSharpeSortino")}</p>
              <p className="card-value" style={{ fontSize: 18 }}>{fmtRatio(result.sharpe)} / {fmtRatio(result.sortino)}</p>
              <p className="note">{t("tools.portfolio.avgCoinSharpe", { value: fmtRatio(avgCoinSharpe) })}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.portfolio.periodLeverageCosts")}</p>
              <p className="card-value" style={{ fontSize: 16 }}>{result.days}T · {result.stopLossPct ? `-${result.stopLossPct}%` : t("tools.shared.noStopShort")} · {result.leverage}x{result.allowShort ? t("tools.shared.shortAllowed") : ""} · {result.costPct}%</p>
              {result.days < result.requestedDays && (
                <p className="note">{t("tools.portfolio.shortenedNote", { requested: result.requestedDays })}</p>
              )}
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="section-title">{t("tools.portfolio.portfolioEquityCurve")}</p>
            <EquityChart equityCurve={result.equityCurve} t={t} />
          </div>

          <div className="card">
            <p className="section-title">{t("tools.portfolio.perCoinHeading", { cash: fmtUSD(result.perCoin[0]?.allocatedCash) })}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tools.portfolio.thCoin")}</th>
                    <th>{t("tools.shared.thReturn")}</th>
                    <th>{t("tools.shared.maxDrawdown")}</th>
                    <th>Sharpe</th>
                    <th>{t("tools.portfolio.thSortino")}</th>
                    <th>{t("tools.portfolio.thTrades")}</th>
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
              {t("tools.portfolio.diversificationNote", { portfolioDd: result.maxDrawdown.toFixed(1), avgDd: avgCoinMaxDrawdown.toFixed(1), count: COINS.length })}
              {lowSampleSize && t("tools.portfolio.diversificationLowSample", { avg: avgTradesPerCoin.toFixed(1) })}
            </p>
          </div>
        </>
      )}

      <div className="disclaimer">
        {t("tools.portfolio.disclaimerPre", { symbols: COIN_SYMBOLS })}
        <br /><br />
        <strong>{t("tools.portfolio.disclaimerLimitsLabel")}</strong>{t("tools.portfolio.disclaimerLimitsBody", { count: COINS.length })}
        <br /><br />
        {t("tools.portfolio.disclaimerPost")}
      </div>
    </div>
  );
}
