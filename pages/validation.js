import { useState } from "react";
import Link from "next/link";
import { VALIDATION_HISTORY } from "../lib/validationHistory";
import { GLOSSARY } from "../lib/glossary";
import { COINS } from "../lib/marketData";
import { useLanguage } from "../lib/i18n";
import Logo from "../components/Logo";
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

// active = adopted/confirmed (beeinflusst das Live-Signal), optional =
// optional verfügbar (opt-in, nicht standardmäßig aktiv), rejected =
// rejected/harmful (verworfen). Bucket-Zuordnung an einer Stelle, sowohl
// für die Zusammenfassung oben als auch die Filter-Tabs genutzt.
function bucketOf(outcome) {
  if (outcome === "adopted" || outcome === "confirmed") return "active";
  if (outcome === "optional") return "optional";
  return "rejected"; // rejected | harmful
}

// Manuell statt automatischer Text-Erkennung gepflegt -- zuverlässiger als
// Substring-Matching auf übersetzte Strings, und es gibt für die meisten
// Einträge (SuperTrend/ADX/Marubozu/OBV/Bollinger/Take-Profit) noch keinen
// passenden Glossar-Begriff, den man ehrlich verlinken könnte.
const GLOSSARY_LINKS = {
  "macroweight-threshold-sweep": ["makro-regime"],
  "nasdaq-macro": ["makro-regime"],
  "sp500-macro": ["makro-regime"],
  "rsi-fg-volume": ["rsi", "fear-greed", "handelsvolumen"],
  "m2-vix-direction": ["vix", "makro-regime"],
  "macro-weight": ["makro-regime"],
};

const GLOSSARY_BY_ID = Object.fromEntries(GLOSSARY.flatMap((g) => g.terms).map((term) => [term.id, term]));

function fmtDate(iso, lang) {
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(lang === "de" ? "de-DE" : "en-GB");
}

export default function Validation() {
  const { t, lang } = useLanguage();
  const [filter, setFilter] = useState("all");
  const [detailsOpen, setDetailsOpen] = useState({});

  const counts = VALIDATION_HISTORY.reduce(
    (acc, e) => {
      acc[bucketOf(e.outcome)]++;
      return acc;
    },
    { active: 0, optional: 0, rejected: 0 }
  );

  const filtered = filter === "all" ? VALIDATION_HISTORY : VALIDATION_HISTORY.filter((e) => bucketOf(e.outcome) === filter);

  const FILTERS = [
    { key: "all", label: t("validation.filterAll") },
    { key: "active", label: t("validation.filterActive") },
    { key: "optional", label: t("validation.filterOptional") },
    { key: "rejected", label: t("validation.filterRejected") },
  ];

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "0.75rem" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          <Logo size={40} />
          <div>
            <h1>{t("validation.h1")}</h1>
            <p className="subtitle">{t("validation.subtitle")}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p style={{ fontWeight: 600, marginBottom: 10 }}>
          {t("validation.summary", { active: counts.active, optional: counts.optional, rejected: counts.rejected, total: VALIDATION_HISTORY.length })}
        </p>
        <p className="section-title" style={{ fontSize: 14, marginBottom: 4 }}>{t("validation.whatItMeansTitle")}</p>
        <p className="note" style={{ marginBottom: 12 }}>{t("validation.whatItMeansBody")}</p>
        <p>{t("validation.intro", { coinCount: COINS.length, coins: COINS.map((c) => c.symbol).join(", ") })}</p>
        <p className="note" style={{ marginTop: 10 }}>{t("validation.introNotePre")}</p>
        <p className="note" style={{ marginTop: 6 }}>
          {t("validation.introGlossaryPre")}
          <Link href="/glossar">{t("validation.introGlossaryLink")}</Link>
        </p>
      </div>

      <div className="tabs" style={{ marginBottom: "1rem" }}>
        {FILTERS.map((f) => (
          <button key={f.key} className={filter === f.key ? "active" : ""} onClick={() => setFilter(f.key)}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.map((entry) => {
        const outcome = OUTCOME[entry.outcome];
        const open = !!detailsOpen[entry.id];
        const links = GLOSSARY_LINKS[entry.id] || [];
        return (
          <div className="card" key={entry.id} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <p className="section-title" style={{ margin: 0, fontSize: 15 }}>{entry.factor[lang]}</p>
              <span className={`badge ${outcome.cls}`}>{outcome.label[lang]}</span>
            </div>
            <p className="note" style={{ marginBottom: 8 }}>{fmtDate(entry.date, lang)}</p>

            {links.length > 0 && (
              <p className="note" style={{ marginBottom: 8 }}>
                {t("validation.relatedTerms")}
                {links.map((id, i) => (
                  <span key={id}>
                    {i > 0 && ", "}
                    <Link href={`/glossar#${id}`}>{GLOSSARY_BY_ID[id].term[lang]}</Link>
                  </span>
                ))}
              </p>
            )}

            <button className="details-toggle" onClick={() => setDetailsOpen((prev) => ({ ...prev, [entry.id]: !prev[entry.id] }))}>
              {open ? t("validation.detailsHide") : t("validation.detailsShow")}
            </button>
            {open && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>{t("validation.hypothesisLabel")}</strong> {entry.hypothesis[lang]}</p>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>{t("validation.methodLabel")}</strong> {entry.method[lang]}</p>
                <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>{t("validation.resultLabel")}</strong> {entry.result[lang]}</p>
              </div>
            )}
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
