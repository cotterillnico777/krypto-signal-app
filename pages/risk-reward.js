import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { calculatePositionSize } from "../lib/trades";
import { useLanguage } from "../lib/i18n";

export const getServerSideProps = requireActiveAccess;

export default function RiskReward({ user, access }) {
  const { t } = useLanguage();
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
        title={t("riskReward.title")}
        subtitle={t("riskReward.subtitle")}
        active="risk-reward"
        user={user}
        access={access}
      />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">{t("riskReward.inputs")}</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.85rem" }}>
          <label className="field">
            {t("riskReward.entryPrice")}
            <input className="input" type="number" step="any" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} />
          </label>
          <label className="field">
            {t("riskReward.stopLoss")}
            <input className="input" type="number" step="any" value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} />
          </label>
          <label className="field">
            {t("riskReward.takeProfit")}
            <input className="input" type="number" step="any" value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} />
          </label>
          <label className="field">
            {t("riskReward.accountSize")}
            <input className="input" type="number" step="any" value={accountSize} onChange={(e) => setAccountSize(e.target.value)} />
          </label>
          <label className="field">
            {t("riskReward.riskPerTrade")}
            <input className="input" type="number" step="any" value={riskPct} onChange={(e) => setRiskPct(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="grid grid-3">
        <div className="card">
          <p className="card-label">{t("riskReward.riskRewardRatio")}</p>
          <p className="card-value">{riskRewardRatio == null ? "n/a" : `1 : ${riskRewardRatio.toFixed(2)}`}</p>
          <p className="note">{t("riskReward.riskRewardNote")}</p>
        </div>
        <div className="card">
          <p className="card-label">{t("riskReward.recommendedSize")}</p>
          <p className="card-value">{sizing == null ? "n/a" : `$${sizing.positionSize.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</p>
          <p className="note">{sizing == null ? t("riskReward.fillInFields") : t("riskReward.stopDistance", { pct: sizing.stopDistancePct.toFixed(2) })}</p>
        </div>
        <div className="card">
          <p className="card-label">{t("riskReward.riskPossibleProfit")}</p>
          <p className="card-value" style={{ fontSize: 18 }}>
            <span style={{ color: "var(--red-text)" }}>{sizing == null ? "n/a" : `-$${sizing.riskAmount.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</span>
            {" / "}
            <span style={{ color: "var(--green-text)" }}>{potentialProfit == null ? "n/a" : `+$${potentialProfit.toLocaleString("de-DE", { maximumFractionDigits: 0 })}`}</span>
          </p>
          <p className="note">{t("riskReward.atStopOrTarget")}</p>
        </div>
      </div>

      <div className="disclaimer">
        {t("riskReward.disclaimer")}
      </div>
    </div>
  );
}
