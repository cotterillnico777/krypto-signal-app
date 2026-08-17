import { useState } from "react";
import { COINS } from "../lib/marketData";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { useLanguage } from "../lib/i18n";

export const getServerSideProps = requireActiveAccess;

function fmtPct(n) {
  if (n == null) return "n/a";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtRatio(n) {
  return n == null ? "n/a" : n.toFixed(2);
}

function paramsLabel(p, t) {
  return t("tools.shared.paramsLabel", { smaFast: p.smaFast, smaSlow: p.smaSlow, rsiBuy: p.rsiBuyThreshold, rsiSell: p.rsiSellThreshold, adx: p.adxThreshold ?? t("tools.shared.adxOff") });
}

function perCoinLabel(perCoin) {
  return perCoin.map((c) => `${c.symbol} ${fmtPct(c.totalReturnPct)}`).join(" · ");
}

export default function Optimize({ user, access }) {
  const { t } = useLanguage();
  const PERIODS = [
    { key: 365, label: t("tools.shared.p365") },
    { key: 730, label: t("tools.shared.p730") },
    { key: 1460, label: t("tools.shared.p1460") },
    { key: 2920, label: t("tools.shared.p2920") },
  ];
  const COSTS = [
    { key: 0, label: t("tools.shared.cost0") },
    { key: 0.15, label: t("tools.shared.cost15") },
    { key: 0.3, label: t("tools.shared.cost30") },
  ];

  const [mode, setMode] = useState("single");
  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(730);
  const [costPct, setCostPct] = useState(0.15);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runOptimize() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const modeParam = mode === "multi" ? "&mode=multi" : `&coin=${coinId}`;
      const res = await fetch(`/api/optimize?days=${days}${modeParam}&cost=${costPct}`);
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
        title={t("tools.optimize.title")}
        subtitle={t("tools.optimize.subtitle")}
        active="optimize"
        user={user}
        access={access}
      />

      <div className="toolbar">
        <span className="note-label" style={{ fontSize: 12.5 }}>{t("tools.shared.mode")}</span>
        <div className="tabs">
          <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")} style={{ padding: "5px 10px", fontSize: 12 }}>{t("tools.shared.oneCoin")}</button>
          <button className={mode === "multi" ? "active" : ""} onClick={() => setMode("multi")} style={{ padding: "5px 10px", fontSize: 12 }}>{t("tools.shared.allCoins", { count: COINS.length })}</button>
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
          {mode === "multi" ? t("tools.optimize.bannerMulti", { count: COINS.length }) : t("tools.optimize.bannerSingle")}
        </span>
      </div>

      <button className="icon-btn primary" onClick={runOptimize} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? t("tools.optimize.optimizing") : t("tools.optimize.start")}
      </button>

      {error && <div className="error-box">{t("tools.shared.errorPrefix")}{error}</div>}

      {result && mode === "single" && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">{t("tools.optimize.trainTestSplit")}</p>
            <p className="card-value" style={{ fontSize: 16 }}>
              {t("tools.optimize.trainTestSplitValue", { trainDays: result.trainDays, testDays: result.testDays, splitDate: result.splitDate, count: result.combinationsTestedCount })}
            </p>
          </div>

          <div className="card">
            <p className="section-title">{t("tools.optimize.top5Single")}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tools.shared.hashParam")}</th>
                    <th>{t("tools.shared.parameter")}</th>
                    <th>{t("tools.shared.trainReturn")}</th>
                    <th>{t("tools.shared.trainSharpe")}</th>
                    <th>{t("tools.shared.testReturn")}</th>
                    <th>{t("tools.shared.testSharpe")}</th>
                    <th>{t("tools.shared.testTrades")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top.map((r, i) => {
                    const robust = r.test && r.test.sharpe != null && r.train.sharpe != null && r.test.sharpe > 0;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(r.params, t)}</td>
                        <td><span className={`badge ${r.train.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.train.totalReturnPct)}</span></td>
                        <td>{fmtRatio(r.train.sharpe)}</td>
                        <td><span className={`badge ${r.test?.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.test?.totalReturnPct)}</span></td>
                        <td>
                          {fmtRatio(r.test?.sharpe)}
                          {!robust && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>{t("tools.shared.weakInTest")}</span>}
                        </td>
                        <td>{r.test?.tradeCount ?? "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="note" style={{ marginTop: 12 }}>{t("tools.optimize.noteSingle")}</p>
          </div>
        </>
      )}

      {result && mode === "multi" && (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">{t("tools.optimize.trainTestSplitMultiLabel")}</p>
            <p className="card-value" style={{ fontSize: 16 }}>
              {t("tools.optimize.trainTestSplitMultiValue", { trainDays: result.trainDays, testDays: result.testDays, count: result.combinationsTestedCount, coinCount: result.coins.length, coins: result.coins.join(", ") })}
            </p>
          </div>

          <div className="card">
            <p className="section-title">{t("tools.optimize.top5Multi")}</p>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tools.shared.hashParam")}</th>
                    <th>{t("tools.shared.parameter")}</th>
                    <th>{t("tools.shared.trainAvgReturn")}</th>
                    <th>{t("tools.shared.trainAvgSharpe")}</th>
                    <th>{t("tools.shared.trainConsistency")}</th>
                    <th>{t("tools.shared.testAvgReturn")}</th>
                    <th>{t("tools.shared.testAvgSharpe")}</th>
                    <th>{t("tools.shared.testConsistency")}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.top.map((r, i) => {
                    const robust = r.test && r.test.avgSharpe != null && r.test.avgSharpe > 0 && r.test.positiveCoinCount >= 3;
                    return (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(r.params, t)}</td>
                        <td><span className={`badge ${r.train.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.train.avgReturnPct)}</span></td>
                        <td>{fmtRatio(r.train.avgSharpe)}</td>
                        <td>{t("tools.shared.positiveOf", { positive: r.train.positiveCoinCount, total: r.train.totalCoinCount })}</td>
                        <td><span className={`badge ${r.test?.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(r.test?.avgReturnPct)}</span></td>
                        <td>
                          {fmtRatio(r.test?.avgSharpe)}
                          {!robust && <span className="badge badge-amber" style={{ marginLeft: 6, fontSize: 10 }}>{t("tools.shared.weakInTest")}</span>}
                        </td>
                        <td>{r.test ? t("tools.shared.positiveOf", { positive: r.test.positiveCoinCount, total: r.test.totalCoinCount }) : "n/a"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: 16 }}>
              {result.top.map((r, i) => (
                <p key={i} className="note" style={{ marginTop: 6 }}>
                  <span className="note-label">#{i + 1} {t("tools.optimize.testPerCoin")}</span> {r.test ? perCoinLabel(r.test.perCoin) : "n/a"}
                </p>
              ))}
            </div>
            <p className="note" style={{ marginTop: 12 }}>{t("tools.optimize.noteMulti", { count: COINS.length })}</p>
          </div>
        </>
      )}

      <div className="disclaimer">{t("tools.optimize.disclaimer")}</div>
    </div>
  );
}
