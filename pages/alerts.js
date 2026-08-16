import { useState, useEffect } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

const EMPTY_FORM = { coinId: "bitcoin", direction: "above", targetPrice: "" };

function fmtUSD(n) {
  return n.toLocaleString("de-DE", { maximumFractionDigits: n < 10 ? 4 : 0 });
}

export default function Alerts({ user, access }) {
  const [alerts, setAlerts] = useState([]);
  const [coins, setCoins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAlerts(data.alerts);
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

  async function addAlert(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/alerts", {
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

  async function deleteAlert(id) {
    try {
      const res = await fetch(`/api/alerts/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      setError(e.message);
    }
  }

  const coinById = Object.fromEntries(coins.map((c) => [c.id, c]));

  return (
    <div className="container">
      <AppHeader title="Preis-Alarme" subtitle="Einmalige Benachrichtigung, wenn ein Coin eine Schwelle erreicht" active="alerts" user={user} access={access} />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">Neuer Alarm</p>
        <form onSubmit={addAlert} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem", alignItems: "end" }}>
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
            Richtung
            <select className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}>
              <option value="above">über</option>
              <option value="below">unter</option>
            </select>
          </label>
          <label className="field">
            Zielpreis (USD)
            <input className="input" type="number" step="any" min="0" required value={form.targetPrice} onChange={(e) => setForm({ ...form, targetPrice: e.target.value })} />
          </label>
          <button className="icon-btn primary" type="submit" disabled={saving}>
            {saving ? "…" : "Alarm erstellen"}
          </button>
        </form>
        <p className="note" style={{ marginTop: 10 }}>
          Wird 1x täglich geprüft (gegen das 24h-Hoch/Tief des jeweiligen Coins, damit ein kurzes Über-/Unterschreiten zwischen zwei Prüfungen nicht verpasst wird) -- keine Echtzeit-Benachrichtigung. Löst einmalig aus und wird danach automatisch entfernt.
        </p>
      </div>

      {error && <div className="error-box" style={{ marginBottom: "1rem" }}>Fehler: {error}</div>}

      <div className="card">
        <p className="section-title">Aktive Alarme</p>
        {loading ? (
          <p className="note">Lade…</p>
        ) : alerts.length === 0 ? (
          <p className="note">Noch keine Alarme angelegt.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => {
              const coin = coinById[a.coinId];
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-subtle)", borderRadius: "var(--radius-sm)" }}>
                  <span>
                    {coin?.symbol ?? a.coinId} {a.direction === "above" ? "▲ über" : "▼ unter"} ${fmtUSD(a.targetPrice)}
                    {coin && <span className="note" style={{ marginLeft: 8 }}>(aktuell ${fmtUSD(coin.price)})</span>}
                  </span>
                  <button className="icon-btn" onClick={() => deleteAlert(a.id)} title="Alarm löschen" style={{ padding: "4px 10px" }}>
                    🗑
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="disclaimer">
        Preis-Alarme werden 1x täglich geprüft (Vercel Free-Tier-Limit für Cron-Jobs), nicht in Echtzeit. Keine Anlageberatung.
      </div>
    </div>
  );
}
