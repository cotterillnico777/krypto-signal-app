import { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { computeTradeMetrics, summarizeTrades } from "../lib/trades";

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

  return (
    <div className="container">
      <AppHeader
        title="Trades"
        subtitle="Dein manuelles Trade-Journal und Trade-Tracking"
        active="trades"
        user={user}
        access={access}
      />

      <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
        <div className="card">
          <p className="card-label">Trades</p>
          <p className="card-value">{stats.tradeCount}</p>
          <p className="note">{stats.openCount} offen, {stats.closedCount} geschlossen</p>
        </div>
        <div className="card">
          <p className="card-label">Trefferquote / Ø-R-Multiple</p>
          <p className="card-value" style={{ fontSize: 18 }}>
            {stats.winRate == null ? "n/a" : `${stats.winRate.toFixed(0)}%`} / {stats.avgRMultiple == null ? "n/a" : `${stats.avgRMultiple >= 0 ? "+" : ""}${stats.avgRMultiple.toFixed(2)}R`}
          </p>
        </div>
        <div className="card">
          <p className="card-label">Gesamt-PnL</p>
          <p className="card-value" style={{ color: stats.totalPnl >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
            ${fmtUSD(stats.totalPnl)}
          </p>
          <p className="note">Ø-PnL pro Trade: {stats.avgPnlPct == null ? "n/a" : fmtPct(stats.avgPnlPct)}</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">Neuer Trade</p>
        <form onSubmit={addTrade} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
          <label className="field">
            Symbol
            <input className="input" required value={form.symbol} onChange={(e) => setForm({ ...form, symbol: e.target.value })} placeholder="BTC" />
          </label>
          <label className="field">
            Richtung
            <div className="tabs">
              <button type="button" className={form.direction === "long" ? "active" : ""} onClick={() => setForm({ ...form, direction: "long" })}>Long</button>
              <button type="button" className={form.direction === "short" ? "active" : ""} onClick={() => setForm({ ...form, direction: "short" })}>Short</button>
            </div>
          </label>
          <label className="field">
            Entry-Preis
            <input className="input" required type="number" step="any" value={form.entryPrice} onChange={(e) => setForm({ ...form, entryPrice: e.target.value })} />
          </label>
          <label className="field">
            Stop-Loss (optional)
            <input className="input" type="number" step="any" value={form.stopLoss} onChange={(e) => setForm({ ...form, stopLoss: e.target.value })} />
          </label>
          <label className="field">
            Take-Profit (optional)
            <input className="input" type="number" step="any" value={form.takeProfit} onChange={(e) => setForm({ ...form, takeProfit: e.target.value })} />
          </label>
          <label className="field">
            Positionsgröße (USD)
            <input className="input" required type="number" step="any" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} />
          </label>
          <label className="field">
            Entry-Datum
            <input className="input" type="datetime-local" value={form.entryAt} onChange={(e) => setForm({ ...form, entryAt: e.target.value })} />
          </label>
          <label className="field" style={{ gridColumn: "1 / -1" }}>
            Notizen
            <textarea className="textarea" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Warum bin ich rein? Was war der Plan?" />
          </label>
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="icon-btn primary" type="submit" disabled={saving}>
              {saving ? "Speichere…" : "+ Trade hinzufügen"}
            </button>
          </div>
        </form>
      </div>

      {error && <div className="error-box">Fehler: {error}</div>}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">KI-Analyse</p>
        <p className="note">Lässt Claude Muster in deinem Journal suchen (Trefferquote, Risikomanagement, wiederkehrende Fehler). Max. 5 Analysen pro Tag.</p>
        <button className="ai-btn" onClick={analyzeJournal} disabled={aiLoading || trades.length === 0}>
          {aiLoading ? "Analysiere…" : "🤖 KI-Analyse meines Journals"}
        </button>
        {aiError && <div className="error-box" style={{ marginTop: 10 }}>Fehler: {aiError}</div>}
        {aiAnalysis && <div className="ai-result">{aiAnalysis}</div>}
      </div>

      <div className="card">
        <p className="section-title">Trade-Historie {loading && "(lädt…)"}</p>
        {!loading && trades.length === 0 ? (
          <p className="note">Noch keine Trades erfasst.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Richtung</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Stop / Target</th>
                  <th>PnL</th>
                  <th>R-Multiple</th>
                  <th>Notizen</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => {
                  const m = computeTradeMetrics(t);
                  return (
                    <tr key={t.id}>
                      <td>{t.symbol}</td>
                      <td><span className={`badge ${t.direction === "short" ? "badge-red" : "badge-green"}`}>{t.direction === "short" ? "Short" : "Long"}</span></td>
                      <td>{t.entryPrice}</td>
                      <td>
                        {m.status === "closed" ? (
                          t.exitPrice
                        ) : (
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              className="input"
                              style={{ width: 90, padding: "4px 8px" }}
                              type="number"
                              step="any"
                              placeholder="Exit-Preis"
                              value={exitDrafts[t.id] || ""}
                              onChange={(e) => setExitDrafts((prev) => ({ ...prev, [t.id]: e.target.value }))}
                            />
                            <button className="icon-btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => closeTrade(t.id)}>Schließen</button>
                          </div>
                        )}
                      </td>
                      <td>{t.stopLoss ?? "–"} / {t.takeProfit ?? "–"}</td>
                      <td>{m.pnlPct == null ? <span className="badge badge-gray">offen</span> : <span className={`badge ${m.pnlPct >= 0 ? "badge-green" : "badge-red"}`}>{fmtPct(m.pnlPct)}</span>}</td>
                      <td>{m.rMultiple == null ? "–" : `${m.rMultiple >= 0 ? "+" : ""}${m.rMultiple.toFixed(2)}R`}</td>
                      <td style={{ maxWidth: 220, fontSize: 12.5, color: "var(--text-muted)" }}>{t.notes}</td>
                      <td><button className="icon-btn" style={{ padding: "4px 8px", fontSize: 12 }} onClick={() => deleteTrade(t.id)}>🗑</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="disclaimer">
        Rein manuelles Trade-Tracking, keine Anbindung an eine Exchange. Positionsgröße ist der USD-Notionalwert, PnL wird daraus berechnet, nicht gespeichert. Keine Anlageberatung.
      </div>
    </div>
  );
}
