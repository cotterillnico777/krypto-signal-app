import { useState } from "react";
import { COINS } from "../lib/marketData";
import { PARAM_TIPS } from "../lib/paramTips";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { useLanguage } from "../lib/i18n";

export const getServerSideProps = requireActiveAccess;

// ADX-Trendfilter: schwächt Kaufen/Verkaufen-Crossover-Signale zu Halten ab,
// wenn der Trend laut ADX zu schwach ist (siehe combineSignal/adxThreshold).
// Standard "Kein Filter" (wie bisher) -- ein Multi-Coin-Test (11.08.2026,
// 5 Coins über 365/730/850 Tage) zeigte bei ADX 20 keinen robusten Effekt:
// half BTC/ETH/XRP teils deutlich, schadete Solana/Bittensor teils deutlich
// (bis -73% im 850-Tage-Fenster) -- kein globaler Default, aber je nach Coin/
// Setup einen Blick wert, deshalb als Regler verfügbar statt nur per API.
const TRENDFILTER_KEYS = [null, 15, 20, 25];

function fmtUSD(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 3 : 0 });
}

function fmtPct(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
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
        <span className="legend-item"><span className="dot dot-accent" />{t("tools.backtest.title")}</span>
        <span className="legend-item"><span className="dot dot-muted" />Buy &amp; Hold</span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h}>
        <polyline points={toPoints("buyHoldEquity")} fill="none" stroke="var(--text-faint)" strokeWidth="2" />
        <polyline points={toPoints("equity")} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
      </svg>
    </div>
  );
}

export default function Backtest({ user, access }) {
  const { t, lang } = useLanguage();
  const PERIODS = [
    { key: 90, label: t("tools.shared.p90") },
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
    { key: 10, label: "10x" },
  ];
  const COSTS = [
    { key: 0, label: t("tools.shared.cost0") },
    { key: 0.15, label: t("tools.shared.cost15") },
    { key: 0.3, label: t("tools.shared.cost30") },
  ];
  const TRENDFILTERS = TRENDFILTER_KEYS.map((key) => ({ key, label: key === null ? t("tools.shared.trendfilterNone") : `ADX ${key}` }));

  const [coinId, setCoinId] = useState("bitcoin");
  const [days, setDays] = useState(365);
  const [stopLoss, setStopLoss] = useState(null);
  const [adxThreshold, setAdxThreshold] = useState(null);
  const [allowShort, setAllowShort] = useState(false);
  const [leverage, setLeverage] = useState(1);
  const [costPct, setCostPct] = useState(0.15);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const stopParam = stopLoss ? `&stopLoss=${stopLoss}` : "";
      const adxParam = adxThreshold ? `&adx=${adxThreshold}` : "";
      const shortParam = allowShort ? "&short=1" : "";
      const leverageParam = leverage !== 1 ? `&leverage=${leverage}` : "";
      const costParam = `&cost=${costPct}`;
      const res = await fetch(`/api/backtest?coin=${coinId}&days=${days}${stopParam}${adxParam}${shortParam}${leverageParam}${costParam}`);
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
        title={t("tools.backtest.title")}
        subtitle={t("tools.backtest.subtitle")}
        active="backtest"
        user={user}
        access={access}
      />

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

      {PARAM_TIPS[coinId] && (
        <div className="card" style={{ marginBottom: "1rem", background: "var(--bg-subtle)" }}>
          <p className="note-label" style={{ fontSize: 12.5, marginBottom: 6 }}>
            {t("tools.shared.tipForCoin", { symbol: COINS.find((c) => c.id === coinId)?.symbol })}
          </p>
          <p style={{ margin: "0 0 6px" }}>
            <span className={`badge ${PARAM_TIPS[coinId].isDefault ? "badge-gray" : "badge-green"}`} style={{ fontSize: 12.5 }}>
              {PARAM_TIPS[coinId].label[lang]}
            </span>
          </p>
          <p className="note" style={{ marginTop: 0, marginBottom: 8 }}>{PARAM_TIPS[coinId].evidence[lang]}</p>
          <button
            className="icon-btn"
            onClick={() => {
              setStopLoss(PARAM_TIPS[coinId].stopLossPct);
              setAllowShort(PARAM_TIPS[coinId].allowShort);
              setLeverage(PARAM_TIPS[coinId].leverage);
            }}
          >
            {t("tools.shared.applyTip")}
          </button>
        </div>
      )}

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
        <span className="note-label" style={{ fontSize: 12.5 }} title={t("tools.backtest.trendfilterTooltip")}>{t("tools.shared.trendfilterLabel")}</span>
        <div className="tabs">
          {TRENDFILTERS.map((tf) => (
            <button key={tf.label} className={adxThreshold === tf.key ? "active" : ""} onClick={() => setAdxThreshold(tf.key)} style={{ padding: "5px 10px", fontSize: 12 }}>
              {tf.label}
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

      {leverage > 1 && (
        <div className="toast-banner" style={{ marginBottom: "1rem" }}>
          <span className="msg">{t("tools.backtest.liquidationWarning", { leverage, pct: (100 / leverage).toFixed(1) })}</span>
        </div>
      )}

      <button className="icon-btn primary" onClick={runBacktest} disabled={loading} style={{ marginBottom: "1.5rem" }}>
        {loading ? t("tools.shared.simulating") : t("tools.backtest.start")}
      </button>

      {error && <div className="error-box">{t("tools.shared.errorPrefix")}{error}</div>}

      {result && (
        <>
          <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
            <div className="card">
              <p className="card-label">{t("tools.shared.strategyReturn")}</p>
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
              <p className="note">{t("tools.shared.buyHoldNote")}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.shared.maxDrawdown")}</p>
              <p className="card-value">{result.maxDrawdown.toFixed(1)}%</p>
              <p className="note">{t("tools.shared.maxDrawdownNote")}</p>
            </div>
          </div>

          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">{t("tools.shared.tradeCount")}</p>
              <p className="card-value">{result.tradeCount}</p>
              {result.liquidationCount > 0 && <p className="note">{t("tools.shared.liquidatedNote", { count: result.liquidationCount })}</p>}
            </div>
            <div className="card">
              <p className="card-label">{t("tools.shared.winRate")}</p>
              <p className="card-value">{result.winRate === null ? "n/a" : `${result.winRate.toFixed(0)}%`}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("tools.shared.sharpeSortino")}</p>
              <p className="card-value" style={{ fontSize: 18 }}>{result.sharpe === null ? "n/a" : result.sharpe.toFixed(2)} / {result.sortino === null ? "n/a" : result.sortino.toFixed(2)}</p>
              <p className="note">{t("tools.shared.sharpeSortinoNote")}</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="card-label">{t("tools.backtest.metaLabel")}</p>
            <p className="card-value" style={{ fontSize: 16 }}>{result.coin.symbol} · {result.days}T · {result.stopLossPct ? `-${result.stopLossPct}%` : t("tools.shared.noStopShort")} · {result.adxThreshold ? `ADX ${result.adxThreshold}` : t("tools.shared.noFilterShort")} · {result.leverage}x{result.allowShort ? t("tools.shared.shortAllowed") : ""} · {result.costPct}{t("tools.shared.costsPerSide")}</p>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="section-title">{t("tools.shared.equityCurve")}</p>
            <EquityChart equityCurve={result.equityCurve} t={t} />
          </div>

          <div className="card">
            <p className="section-title">{t("tools.shared.tradesHeading", { count: result.tradeCount })}</p>
            {result.tradeCount === 0 ? (
              <p className="note">{t("tools.shared.noTrades")}</p>
            ) : (
              <div className="table-wrap">
                <table className="table">
                  <thead>
                    <tr>
                      <th>{t("tools.shared.thDirection")}</th>
                      <th>{t("tools.shared.thEntry")}</th>
                      <th>{t("tools.shared.thEntryPrice")}</th>
                      <th>{t("tools.shared.thExit")}</th>
                      <th>{t("tools.shared.thExitPrice")}</th>
                      <th>{t("tools.shared.thReturn")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.trades.map((tr, i) => (
                      <tr key={i}>
                        <td><span className={`badge ${tr.direction === "short" ? "badge-red" : "badge-green"}`}>{tr.direction === "short" ? t("tools.shared.short") : t("tools.shared.long")}</span></td>
                        <td>{tr.entryDate}</td>
                        <td>${fmtUSD(tr.entryPrice)}</td>
                        <td>{tr.exitDate}{tr.openAtEnd ? t("tools.shared.openSuffix") : ""}{tr.stoppedOut ? t("tools.shared.stopSuffix") : ""}{tr.liquidated ? t("tools.shared.liquidatedSuffix") : ""}{tr.tookProfit ? t("tools.shared.targetSuffix") : ""}</td>
                        <td>${fmtUSD(tr.exitPrice)}</td>
                        <td>
                          <span className={`badge ${tr.returnPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(tr.returnPct)}</span>
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

      <div className="disclaimer">{t("tools.backtest.disclaimer")}</div>
    </div>
  );
}
