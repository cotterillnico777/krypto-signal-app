import Link from "next/link";
import { VALIDATION_HISTORY } from "../lib/validationHistory";
import { useLanguage } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

// Bewusst KEIN getServerSideProps = requireActiveAccess -- diese Seite ist
// die einzige inhaltliche öffentliche Seite der App (neben login.js/signup.js/
// upgrade.js), gedacht als Vertrauensanker für Interessenten VOR der
// Anmeldung. Folgt deshalb dem Layout-Muster von login.js (eigener
// schlanker .brand-Header) statt AppHeader (kein Tool-Nav, kein Logout-
// Button, da Besucher hier meist nicht eingeloggt sind).

const OUTCOME = {
  adopted: { cls: "badge-green", label: { de: "Übernommen", en: "Adopted" } },
  confirmed: { cls: "badge-green", label: { de: "Bleibt aktiv", en: "Stays active" } },
  rejected: { cls: "badge-gray", label: { de: "Kein Effekt gefunden", en: "No effect found" } },
  harmful: { cls: "badge-red", label: { de: "Schadet mehr als es hilft", en: "Hurts more than it helps" } },
  optional: { cls: "badge-amber", label: { de: "Gemischt — optional verfügbar", en: "Mixed — available as opt-in" } },
};

function fmtDate(iso, lang) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB");
}

export default function Validation() {
  const { t, lang } = useLanguage();

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "0.75rem" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>{t("validation.h1")}</h1>
            <p className="subtitle">{t("validation.subtitle")}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p>{t("validation.intro")}</p>
        <p className="note" style={{ marginTop: 10 }}>{t("validation.introNotePre")}</p>
        <p className="note" style={{ marginTop: 6 }}>
          {t("validation.introGlossaryPre")}
          <Link href="/glossar">{t("validation.introGlossaryLink")}</Link>
        </p>
      </div>

      {VALIDATION_HISTORY.map((entry) => {
        const outcome = OUTCOME[entry.outcome];
        return (
          <div className="card" key={entry.id} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <p className="section-title" style={{ margin: 0, fontSize: 15 }}>{entry.factor[lang]}</p>
              <span className={`badge ${outcome.cls}`}>{outcome.label[lang]}</span>
            </div>
            <p className="note" style={{ marginBottom: 8 }}>{fmtDate(entry.date, lang)}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>{t("validation.hypothesisLabel")}</strong> {entry.hypothesis[lang]}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>{t("validation.methodLabel")}</strong> {entry.method[lang]}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>{t("validation.resultLabel")}</strong> {entry.result[lang]}</p>
          </div>
        );
      })}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>{t("validation.tryYourself")}</p>
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
