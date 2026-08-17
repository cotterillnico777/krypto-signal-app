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

export default function WalkForward({ user, access }) {
  const { t } = useLanguage();
  const PERIODS = [
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
        title={t("tools.walkforward.title")}
        subtitle={t("tools.walkforward.subtitle")}
        active="walkforward"
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
          {t("tools.walkforward.bannerBase")}
          {mode === "multi" ? t("tools.walkforward.bannerMultiSuffix", { count: COINS.length }) : ""}
        </span>
      </div>

      <button className="icon-btn primary" onClick={runWalkForward} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? t("tools.walkforward.validating") : t("tools.walkforward.start")}
      </button>

      {error && <div className="error-box">{t("tools.shared.errorPrefix")}{error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">{t("tools.walkforward.avgOosReturn")}</p>
              <p className="card-value" style={{ color: result.avgOosReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
                {fmtPct(result.avgOosReturnPct)}
              </p>
              <p className="note">{t("tools.walkforward.avgOosReturnNoteSingle", { count: result.foldCount })}{mode === "multi" ? t("tools.walkforward.avgOosReturnNoteMulti", { count: COINS.length }) : ""}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.walkforward.avgOosSharpe")}</p>
              <p className="card-value">{fmtRatio(result.avgOosSharpe)}</p>
              <p className="note">{t("tools.walkforward.avgOosSharpeNote")}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.walkforward.profitableFolds")}</p>
              <p className="card-value">{result.profitableFolds}/{result.foldCount}</p>
              <p className="note">{mode === "multi" ? t("tools.walkforward.profitableFoldsNoteMulti") : t("tools.walkforward.profitableFoldsNoteSingle")}</p>
            </div>
          </div>

          {mode === "multi" && result.days < result.requestedDays && (
            <div className="toast-banner" style={{ marginBottom: "1.5rem" }}>
              <span className="msg">{t("tools.walkforward.shortenedPeriod", { requested: result.requestedDays, actual: result.days })}</span>
            </div>
          )}

          {mode === "single" && (
            <div className="card">
              <p className="section-title">{t("tools.walkforward.foldsDetail")}</p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("tools.walkforward.thFold")}</th>
                      <th>{t("tools.walkforward.thTrainDays")}</th>
                      <th>{t("tools.walkforward.thTestPeriod")}</th>
                      <th>{t("tools.walkforward.thChosenParams")}</th>
                      <th>{t("tools.shared.trainSharpe")}</th>
                      <th>{t("tools.shared.testReturn")}</th>
                      <th>{t("tools.shared.testSharpe")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.folds.map((f) => (
                      <tr key={f.fold}>
                        <td>{f.fold}</td>
                        <td>{f.trainDays}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{f.testStart} → {f.testEnd}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(f.params, t)}</td>
                        <td>{fmtRatio(f.train.sharpe)}</td>
                        <td><span className={`badge ${f.test.totalReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(f.test.totalReturnPct)}</span></td>
                        <td>{fmtRatio(f.test.sharpe)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="note" style={{ marginTop: 12 }}>{t("tools.walkforward.noteSingle")}</p>
            </div>
          )}

          {mode === "multi" && (
            <div className="card">
              <p className="section-title">{t("tools.walkforward.foldsDetailMulti", { count: COINS.length })}</p>
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("tools.walkforward.thFold")}</th>
                      <th>{t("tools.walkforward.thTrainDays")}</th>
                      <th>{t("tools.walkforward.thTestPeriod")}</th>
                      <th>{t("tools.walkforward.thChosenParams")}</th>
                      <th>{t("tools.shared.trainAvgSharpe")}</th>
                      <th>{t("tools.shared.testAvgReturn")}</th>
                      <th>{t("tools.shared.testAvgSharpe")}</th>
                      <th>{t("tools.shared.testConsistency")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.folds.map((f) => (
                      <tr key={f.fold}>
                        <td>{f.fold}</td>
                        <td>{f.trainDays}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{f.testStart} → {f.testEnd}</td>
                        <td style={{ whiteSpace: "nowrap" }}>{paramsLabel(f.params, t)}</td>
                        <td>{fmtRatio(f.train.avgSharpe)}</td>
                        <td><span className={`badge ${f.test.avgReturnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(f.test.avgReturnPct)}</span></td>
                        <td>{fmtRatio(f.test.avgSharpe)}</td>
                        <td>{t("tools.shared.positiveOf", { positive: f.test.positiveCoinCount, total: f.test.totalCoinCount })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 16 }}>
                {result.folds.map((f) => (
                  <p key={f.fold} className="note" style={{ marginTop: 6 }}>
                    <span className="note-label">{t("tools.walkforward.foldTestPerCoin", { fold: f.fold })}</span> {perCoinLabel(f.test.perCoin)}
                  </p>
                ))}
              </div>
              <p className="note" style={{ marginTop: 12 }}>{t("tools.walkforward.noteMulti", { count: COINS.length })}</p>
            </div>
          )}
        </>
      )}

      <div className="disclaimer">{t("tools.walkforward.disclaimer")}</div>
    </div>
  );
}
