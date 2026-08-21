import { LEARN_PATHS } from "../lib/learnPaths";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { useLanguage } from "../lib/i18n";

export const getServerSideProps = requireActiveAccess;

// Stabile Grundlage für Finlyras Lernbereich -- zeigt die geplante Struktur
// (6 Lernpfade aus lib/learnPaths.js) ehrlich als "in Vorbereitung", statt
// unfertige Lektionen als fertig darzustellen oder Inhalte zu erfinden.
// Gegatet wie die übrigen AppHeader-Seiten (Dashboard/Analyse/Journal/Info),
// erreichbar über den neuen "Lernen"-Direktlink in components/AppHeader.js.
export default function Learn({ user, access }) {
  const { t } = useLanguage();

  return (
    <div className="container">
      <AppHeader title={t("learn.h1")} subtitle={t("learn.subtitle")} active="learn" user={user} access={access} />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p>{t("learn.intro")}</p>
      </div>

      <div className="grid grid-3">
        {LEARN_PATHS.map((path) => (
          <div className="card" key={path.id}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
              <p className="section-title" style={{ margin: 0, fontSize: 15 }}>{t(path.titleKey)}</p>
              <span className="badge badge-amber" style={{ flexShrink: 0 }}>{t("learn.statusInPreparation")}</span>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}>
              <strong style={{ color: "var(--text)" }}>{t("learn.audienceLabel")}</strong> {t(path.audienceKey)}
            </p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}>
              <strong style={{ color: "var(--text)" }}>{t("learn.goalLabel")}</strong> {t(path.goalKey)}
            </p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 4 }}>
              <strong style={{ color: "var(--text)" }}>{t("learn.modulesLabel")}</strong>
            </p>
            <ul style={{ fontSize: 13.5, color: "var(--text-muted)", margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
              {path.modulesKey.map((moduleKey) => (
                <li key={moduleKey}>{t(moduleKey)}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
