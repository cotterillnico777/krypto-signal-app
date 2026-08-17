import Link from "next/link";
import { GLOSSARY } from "../lib/glossary";
import { useLanguage } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

// Bewusst KEIN getServerSideProps = requireActiveAccess -- öffentliche
// Lern-Seite, gleiches Muster wie pages/validation.js: eigener schlanker
// .brand-Header statt AppHeader, erreichbar auch ohne Login. Pull-Faktor #3
// für Retail-/Neuling-Investoren -- mehr Tiefe als die Dashboard-Tooltips
// erlauben, ohne die Erklärungen dort aufzublähen.
export default function Glossar() {
  const { t, lang } = useLanguage();

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "0.75rem" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>{t("glossar.h1")}</h1>
            <p className="subtitle">{t("glossar.subtitle")}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p>
          {t("glossar.introPre")}
          <Link href="/validation">{t("glossar.introLink")}</Link>
          {t("glossar.introPost")}
        </p>
      </div>

      {GLOSSARY.map((group) => (
        <div key={group.category.de} style={{ marginBottom: "1.75rem" }}>
          <p className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>{group.category[lang]}</p>
          {group.terms.map((term) => (
            <div className="card" key={term.term.de} style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{term.term[lang]}</p>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{term.explanation[lang]}</p>
            </div>
          ))}
        </div>
      ))}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>{t("glossar.ready")}</p>
        <p className="note" style={{ justifyContent: "center", marginBottom: 14 }}>{t("common.trialFreeNoCard")}</p>
        <Link href="/signup" className="icon-btn primary">{t("common.signupCta")}</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          {t("common.alreadyAccount")}
          <Link href="/login">{t("common.login")}</Link>
        </p>
      </div>
    </div>
  );
}
