import LogoutButton from "../components/LogoutButton";
import { useLanguage } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

// Ziel von requireActiveAccess, wenn Trial abgelaufen ist und kein aktives
// Abo besteht. Bewusst NICHT selbst gegatet (sonst Redirect-Schleife) und
// bewusst ohne Stripe-Integration -- das ist die Phase-2-Nahtstelle, der CTA
// hier wird später zum Auslöser der Stripe-Checkout-Session.
export default function Upgrade() {
  const { t } = useLanguage();

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1.5rem" }}>
          <div className="brand" style={{ marginBottom: 0 }}>
            <div className="brand-mark">F</div>
            <div>
              <h1>{t("upgrade.title")}</h1>
              <p className="subtitle">{t("common.appName")}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>
        <p>{t("upgrade.body")}</p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <LogoutButton label={t("common.logout")} />
        </div>
      </div>
    </div>
  );
}
