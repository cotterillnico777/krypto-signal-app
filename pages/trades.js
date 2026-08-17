import { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { computeTradeMetrics, summarizeTrades, computeGamification } from "../lib/trades";
import { useLanguage } from "../lib/i18n";

export const getServerSideProps = requireActiveAccess;

const EMPTY_FORM = {
  symbol: "",
  direction: "long",
  entryPrice: "",
  stopLoss: "",
  takeProfit: "",
  size: "",
  entryAt: new Date().toISOString().slice(0, 16),
  notes: "",
};

function fmtPct(n) {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function fmtUSD(n) {
  return `${n >= 0 ? "+" : ""}${n.toLocaleString("de-DE", { maximumFractionDigits: 2 })}`;
}

export default function Trades({ user, access }) {
  const { t } = useLanguage();
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [exitDrafts, setExitDrafts] = useState({});
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiError, setAiError] = useState(null);

  async function loadTrades() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/trades");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTrades(data.trades);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTrades();
  }, []);

  async function addTrade(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: form.symbol.trim().toUpperCase(),
          direction: form.direction,
          entryPrice: parseFloat(form.entryPrice),
          stopLoss: form.stopLoss ? parseFloat(form.stopLoss) : null,
          takeProfit: form.takeProfit ? parseFloat(form.takeProfit) : null,
          size: parseFloat(form.size),
          entryAt: form.entryAt ? new Date(form.entryAt).toISOString() : undefined,
          notes: form.notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm({ ...EMPTY_FORM, entryAt: new Date().toISOString().slice(0, 16) });
      await loadTrades();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function closeTrade(id) {
    const exitPrice = parseFloat(exitDrafts[id]);
    if (!exitPrice) return;
    setError(null);
    try {
      const res = await fetch(`/api/trades/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exitPrice, exitAt: new Date().toISOString() }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setExitDrafts((prev) => ({ ...prev, [id]: undefined }));
      await loadTrades();
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteTrade(id) {
    setError(null);
    try {
      const res = await fetch(`/api/trades/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      await loadTrades();
    } catch (e) {
      setError(e.message);
    }
  }

  async function analyzeJournal() {
    setAiLoading(true);
    setAiError(null);
    setAiAnalysis(null);
    try {
      const res = await fetch("/api/trades/analyze", { method: "POST" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiAnalysis(data.analysis);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  }

  const stats = summarizeTrades(trades);
  const game = computeGamification(trades);

  return (
    <div className="container">
      <AppHeader
        title={t("trades.title")}
        subtitle={t("trades.subtitle")}
        active="trades"
        user={user}
        access={access}
      />

      <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <p className="card-label">{t("trades.tradesLabel")}</p>
          <p className="card-value">{stats.tradeCount}</p>
          <p className="note">{t("trades.openClosedNote", { open: stats.openCount, closed: stats.closedCount })}</p>
        </div>
        <div className="card">
          <p className="card-label">{t("trades.winRateAvgR")}</p>
          <p className="card-value" style={{ fontSize: 18 }}>
            {stats.winRate == null ? "n/a" : `${stats.winRate.toFixed(0)}%`} / {stats.avgRMultiple == null ? "n/a" : `${stats.avgRMultiple >= 0 ? "+" : ""}${stats.avgRMultiple.toFixed(2)}R`}
          </p>
        </div>
        <div className="card">
          <p className="card-label">{t("trades.totalPnl")}</p>
          <p className="card-value" style={{ color: stats.totalPnl >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
            ${fmtUSD(stats.totalPnl)}
          </p>
          <p className="note">{t("trades.avgPnlNote", { value: stats.avgPnlPct == null ? "n/a" : fmtPct(stats.avgPnlPct) })}</p>
        </div>
      </div>

      {trades.length > 0 && (
        <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <p className="card-label">{t("trades.weekStreak")}</p>
            <p className="card-value">🔥 {game.currentStreak}</p>
            <p className="note">{t("trades.streakNote", { unit: game.currentStreak === 1 ? t("trades.weekOne") : t("trades.weekMany") })}{game.longestStreak > game.currentStreak ? t("trades.streakRecord", { record: game.longestStreak }) : ""}</p>
          </div>
          <div className="card" style={{ gridColumn: "span 2" }}>
            <p className="card-label">{t("trades.milestones")}{game.currentMilestone ? t("trades.milestonesLastReached", { count: game.currentMilestone }) : ""}</p>
            {game.next ? (
              <>
                <p className="note" style={{ marginBottom: 6 }}>{t("trades.milestonesToGo", { remaining: game.next - stats.tradeCount, next: game.next })}</p>
                <div style={{ background: "var(--bg-subtle)", borderRadius: 999, height: 8, overflow: "hidden" }}>
                  <div style={{ width: `${game.progressPct}%`, height: "100%", background: "var(--accent)", borderRadius: 999, transition: "width 0.3s ease" }} />
                </div>
              </>
            ) : (
              <p className="note">{t("trades.milestonesAllReached")}</p>
            )}
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">{t("trades.newTrade")}</p>
        <form onSubmit={addTrade} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
          <label className="field">
            {t("trades.symbol")}
            <input className="input" required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="BTC" />
          </label>
          <label className="field">
            {t("trades.direction")}
            <div className="tabs">
              <button type="button" className={form.direction === "long" ? "active" : ""} onClick={() => setForm({ ...form, direction: "long" })}>{t("trades.long")}</button>
              <button type="button" className={form.direction === "short" ? "active" : ""} onClick={() => setForm({ ...form, direction: "short" })}>{t("trades.short")}</button>
            </div>
          </label>
          <label className="field">
            {t("trades.entryPrice")}
            <input className="input" required type="number" step="any" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
          </label>
          <label className="field">
            {t("trades.stopLossOptional")}
            <input className="input" type="number" step="any" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} />
          </label>
          <label className="field">
            {t("trades.takeProfitOptional")}
            <input className="input" type="number" step="any" value={form.takeProfit} onChange={(e) => setForm({ ...form, takeProfit: e.target.value })} />
          </label>
          <label className="field">
            {t("trades.positionSize")}
            <input className="input" required type="number" step="any" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </label>
          <label className="field">
            {t("trades.entryDate")}
            <input className="input" type="datetime-local" value={form.entryAt} onChange={(e) => setForm({ ...form, entryAt: e.target.value })} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            {t("trades.notes")}
            <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder={t("trades.notesPlaceholder")} />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="icon-btn primary" type="submit" disabled={saving}>
              {saving ? t("trades.saving") : t("trades.addTrade")}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="error-box">{t("tools.shared.errorPrefix")}{error}</div>}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">{t("trades.aiAnalysisHeading")}</p>
        <p className="note">{t("trades.aiAnalysisNote")}</p>
        <button className="ai-btn" onClick={analyzeJournal} disabled={aiLoading || trades.length === 0}>
          {aiLoading ? t("trades.analyzing") : t("trades.analyzeButton")}
        </button>
        {aiError && <div className="error-box" style={{ marginTop: 10 }}>{t("tools.shared.errorPrefix")}{aiError}</div>}
        {aiAnalysis && <div className="ai-result">{aiAnalysis}</div>}
      </div>

      <div className="card">
        <p className="section-title">{t("trades.history")} {loading && t("trades.loadingSuffix")}</p>
        {!loading && trades.length === 0 ? (
          <p className="note">{t("trades.noTrades")}</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>{t("trades.symbol")}</th>
                  <th>{t("trades.direction")}</th>
                  <th>{t("trades.thEntry")}</th>
                  <th>{t("trades.thExit")}</th>
                  <th>{t("trades.thStopTarget")}</th>
                  <th>{t("trades.thPnl")}</th>
                  <th>{t("trades.thRMultiple")}</th>
                  <th>{t("trades.thNotes")}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((tr) => {
                  const m = computeTradeMetrics(tr);
                  return (
                    <tr key={tr.id}>
                      <td>{tr.symbol}</td>
                      <td><span className={`badge ${tr.direction === "short" ? "badge-red" : "badge-green"}`}>{tr.direction === "short" ? t("trades.short") : t("trades.long")}</span></td>
                      <td>{tr.entryPrice}</td>
                      <td>
                        {m.status === "closed" ? (
                          tr.exitPrice
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              className="input"
                              style={{ width: 90, padding: "4px 8px" }}
                              type="number"
                              step="any"
                              placeholder={t("trades.exitPricePlaceholder")}
                              value={exitDrafts[tr.id] || ""}
                              onChange={(e) => setExitDrafts((prev) => ({ ...prev, [tr.id]: e.target.value }))}
                            />
                            <button className="icon-btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => closeTrade(tr.id)}>{t("trades.close")}</button>
                          </div>
                        )}
                      </td>
                      <td>{tr.stopLoss ?? "–"} / {tr.takeProfit ?? "–"}</td>
                      <td>{m.pnlPct == null ? <span className="badge badge-gray">{t("trades.open")}</span> : <span className={`badge ${m.pnlPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(m.pnlPct)}</span>}</td>
                      <td>{m.rMultiple == null ? "–" : `${m.rMultiple >= 0 ? "+" : ""}${m.rMultiple.toFixed(2)}R`}</td>
                      <td style={{ maxWidth: 220, fontSize: 12.5, color: "var(--text-muted)" }}>{tr.notes}</td>
                      <td><button className="icon-btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => deleteTrade(tr.id)}>🗑</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="disclaimer">
        {t("trades.disclaimer")}
      </div>
    </div>
  );
}
