import { useLanguage } from "../lib/i18n";

// Nur auf den 6 öffentlichen Seiten eingebunden (login/signup/track-record/
// validation/glossar/upgrade) -- gegatete Seiten bleiben vorerst Deutsch.
export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="lang-toggle" role="group" aria-label="Sprache wählen / choose language">
      <button type="button" className={lang === "de" ? "active" : ""} onClick={() => setLang("de")}>
        DE
      </button>
      <button type="button" className={lang === "en" ? "active" : ""} onClick={() => setLang("en")}>
        EN
      </button>
    </div>
  );
}
