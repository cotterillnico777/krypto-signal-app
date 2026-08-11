import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { calculatePositionSize } from "../lib/trades";

export const getServerSideProps = requireActiveAccess;

export default function RiskReward({ user, access }) {
  const [entryPrice, setEntryPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [accountSize, setAccountSize] = useState("10000");
  const [riskPct, setRiskPct] = useState("1");

  const entry = parseFloat(entryPrice);
  const stop = parseFloat(stopLoss);
  const target = parseFloat(takeProfit);
  const account = parseFloat(accountSize);
  const risk = parseFloat(riskPct);

  const sizing = entry && stop && account && risk ? calculatePositionSize({ entryPrice: entry, stopLoss: stop, accountSize: account, riskPct: risk }) : null;

  const rewardPct = entry && target ? Math.abs((target - entry) / entry) * 100 : null;
  const riskRewardRatio = sizing && rewardPct ? rewardPct / sizing.stopDistancePct : null;
  const potentialProfit = sizing && rewardPct ? (sizing.positionSize * rewardPct) / 100 : null;

  return (
    <div className="container">
      <AppHeader
        title="R:R-Rechner"
        subtitle="Positionsgröße und Risiko/Rendite-Verhältnis vor dem Einstieg berechnen"
        active="risk-reward"
        user={user}
        access={access}
      />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">Eingaben</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
          <label className="field">
            Entry-Preis
            <input className="input" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          </label>
          <label className="field">
            Stop-Loss
            <input className="input" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </label>
          <label className="field">
            Take-Profit
            <input className="input" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
          </label>
          <label className="field">
            Kontogröße (USD)
            <input className="input" type="number" step="any" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} />
          </label>
          <label className="field">
            Risiko pro Trade (%)
            <input className="input" type="number" step="any" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <p className="card-label">Risiko/Rendite-Verhältnis</p>
          <p className="card-value">{riskRewardRatio == null ? "n/a" : `1 : ${riskRewardRatio.toFixed(2)}`}</p>
          <p className="note">Wie viel Rendite pro riskierter Einheit</p>
        </div>
        <div className="card">
          <p className="card-label">Empfohlene Positionsgröße</p>
          <p className="card-value">{sizing == null ? "n/a" : `$${sizing.positionSize.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</p>
          <p className="note">{sizing == null ? "Entry, Stop-Loss, Kontogröße und Risiko% ausfüllen" : `Stop-Abstand: ${sizing.stopDistancePct.toFixed(2)}%`}</p>
        </div>
        <div className="card">
          <p className="card-label">Risiko / möglicher Gewinn</p>
          <p className="card-value" style={{ fontSize: 18 }}>
            <span style={{ color: "var(--red-text)" }}>{sizing == null ? "n/a" : `-$${sizing.riskAmount.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</span>
            {" / "}
            <span style={{ color: "var(--green-text)" }}>{potentialProfit == null ? "n/a" : `+$${potentialProfit.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</span>
          </p>
          <p className="note">Bei Erreichen von Stop-Loss bzw. Take-Profit</p>
        </div>
      </div>

      <div className="disclaimer">
        Reine Positionsgrößen-Berechnung auf Basis deiner Eingaben, kein Abgleich mit echten Kursen. Keine Anlageberatung.
      </div>
    </div>
  );
}
