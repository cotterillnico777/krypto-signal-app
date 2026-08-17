import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "../lib/i18n";

// Kurzer Willkommens-Walkthrough für Neulinge -- Pull-Faktor #1 aus der
// Retail-/Neuling-Roadmap. Zeigt in wenigen Sätzen, was die App tut, wie die
// neue Klartext-Erklärung (explainSignal) und die Glossar-Tooltips zu lesen
// sind, und verweist auf /validation als Vertrauensanker -- bevor der Nutzer
// mit einer dichten Dashboard-Ansicht allein gelassen wird. Einmal pro
// Browser via localStorage-Flag, gleiches Muster wie InstallPrompt.js'
// "installBannerDismissed". Texte kommen aus lib/i18n.js ("onboarding.*")
// statt fest verdrahtetem Deutsch, damit der Sprachumschalter greift.
const STEP_KEYS = [
  { titleKey: "onboarding.step1Title", bodyKey: "onboarding.step1Body" },
  { titleKey: "onboarding.step2Title", bodyKey: "onboarding.step2Body" },
  { titleKey: "onboarding.step3Title", link: true },
  { titleKey: "onboarding.step4Title", bodyKey: "onboarding.step4Body" },
];

export default function OnboardingTour() {
  const { t } = useLanguage();
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("onboardingTourSeen") === "1") return;
    setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem("onboardingTourSeen", "1");
    setVisible(false);
  }

  if (!visible) return null;

  const isLast = step === STEP_KEYS.length - 1;
  const current = STEP_KEYS[step];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card card">
        <p className="onboarding-progress">{t("onboarding.progress", { current: step + 1, total: STEP_KEYS.length })}</p>
        <h2 className="onboarding-title">{t(current.titleKey)}</h2>
        <p className="onboarding-body">
          {current.link ? (
            <>
              {t("onboarding.step3BodyPre")}
              <Link href="/validation">{t("onboarding.step3BodyLink")}</Link>
              {t("onboarding.step3BodyPost")}
            </>
          ) : (
            t(current.bodyKey)
          )}
        </p>
        <div className="onboarding-actions">
          <button className="icon-btn" onClick={finish}>{t("onboarding.skip")}</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button className="icon-btn" onClick={() => setStep((s) => s - 1)}>{t("onboarding.back")}</button>}
            {!isLast && <button className="icon-btn primary" onClick={() => setStep((s) => s + 1)}>{t("onboarding.next")}</button>}
            {isLast && <button className="icon-btn primary" onClick={finish}>{t("onboarding.finish")}</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
