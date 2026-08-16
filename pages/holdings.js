import { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { computeHoldingMetrics } from "../lib/holdings";

export const getServerSideProps = requireActiveAccess;

const EMPTY_FORM = { coinId: "bitcoin", quantity: "", costBasis: "" };

function fmtUSD(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: Math.abs(n) < 10 ? 4 : 0 });
}

export default function Holdings({ user, access }) {
  const [holdings, setHoldings] = useState([]);
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/holdings");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoldings(data.holdings);
      setCoins(data.coins);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function addHolding(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setForm(EMPTY_FORM);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteHolding(id) {
    try {
      const res = await fetch(`/api/holdings/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setHoldings((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  const coinById = Object.fromEntries(coins.map((c) => [c.id, c]));
  const withMetrics = holdings.map((h) => ({
    ...h,
    coin: coinById[h.coinId],
    ...computeHoldingMetrics(h, coinById[h.coinId]?.price ?? null),
  }));
  const totalCost = withMetrics.reduce((sum, h) => sum + h.costValue, 0);
  const totalValue = withMetrics.reduce((sum, h) => sum + (h.currentValue ?? 0), 0);
  const totalPnl = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : null;

  return (
    <div className="container">
      <AppHeader title="Mein Portfolio" subtitle="Echte Bestände eintragen, reale Rendite sehen" active="holdings" user={user} access={access} />

      {holdings.length > 0 && (
        <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
          <div className="card">
            <p className="card-label">Aktueller Wert</p>
            <p className="card-value">${fmtUSD(totalValue)}</p>
            <p className="note">Einstand: ${fmtUSD(totalCost)}</p>
          </div>
          <div className="card">
            <p className="card-label">Gewinn/Verlust</p>
            <p className="card-value" style={{ color: totalPnl >= 0 ? "var(--green-text)" : "var(--red-text)" }}>
              {totalPnl >= 0 ? "+" : ""}${fmtUSD(totalPnl)}
            </p>
            <p className="note">{totalPnlPct != null ? `${totalPnlPct >= 0 ? "+" : ""}${totalPnlPct.toFixed(1)}%` : "n/a"}</p>
          </div>
          <div className="card">
            <p className="card-label">Positionen</p>
            <p className="card-value">{holdings.length}</p>
          </div>
        </div>
      )}

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">Bestand hinzufügen</p>
        <form onSubmit={addHolding} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem", alignItems: "end" }}>
          <label className="field">
            Coin
            <select className="input" value={form.coinId} onChange={(e) => setForm({ ...form, coinId: e.target.value })}>
              {coins.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.symbol} (${fmtUSD(c.price)})
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            Menge
            <input className="input" type="number" step="any" min="0" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </label>
          <label className="field">
            Einstandspreis pro Einheit (USD)
            <input className="input" type="number" step="any" min="0" required value={form.costBasis} onChange={(e) => setForm({ ...form, costBasis: e.target.value })} />
          </label>
          <button className="icon-btn primary" type="submit" disabled={saving}>
            {saving ? "…" : "Hinzufügen"}
          </button>
        </form>
        <p className="note" style={{ marginTop: 10 }}>
          Manuelle Eingabe -- kein Exchange-Zugang, keine automatische Erkennung. Aktueller Kurs kommt live aus dem Dashboard-Datenfeed.
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: "1rem" }}>Fehler: {error}</div>}

      <div className="card">
        <p className="section-title">Bestände</p>
        {loading ? (
          <p className="note">Lade…</p>
        ) : withMetrics.length === 0 ? (
          <p className="note">Noch keine Bestände eingetragen.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {withMetrics.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)", flexWrap: "wrap", gap: 8 }}>
                <span>
                  <strong>{h.coin?.symbol ?? h.coinId}</strong> {h.quantity} Stück · Einstand ${fmtUSD(h.costBasis)}
                  {h.currentValue != null && (
                    <span className="note" style={{ marginLeft: 8 }}>
                      → ${fmtUSD(h.currentValue)} ({h.pnlPct != null ? `${h.pnlPct >= 0 ? "+" : ""}${h.pnlPct.toFixed(1)}%` : "n/a"})
                    </span>
                  )}
                </span>
                <button className="icon-btn" onClick={() => deleteHolding(h.id)} title="Bestand löschen" style={{ padding: "4px 10px" }}>
                  🗑
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="disclaimer">
        Rein manuelle Eingabe, keine Verbindung zu einer Exchange. Aktuelle Kurse verzögert/live vom selben Datenfeed wie das Dashboard. Keine Anlageberatung.
      </div>
    </div>
  );
}
