import Link from "next/link";
import { useLanguage } from "../lib/i18n";
import Logo from "../components/Logo";
import LanguageToggle from "../components/LanguageToggle";

// Platzhalter-Seite -- noch keine echten Nutzungsbedingungen vorhanden.
// Bewusst KEINE erfundenen Inhalte, siehe README/Projekt-Bericht: braucht
// echte Angaben von [[user-nico-cotterill]].
export default function Agb() {
  const { t } = useLanguage();
  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "0.75rem" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          <Logo size={40} />
          <div>
            <h1>{t("legal.termsTitle")}</h1>
          </div>
        </div>
        <LanguageToggle />
      </div>
      <div className="card">
        <p>{t("legal.placeholderBody")}</p>
      </div>
      <p style={{ marginTop: "1rem", fontSize: 13 }}>
        <Link href="/">{t("legal.backHome")}</Link>
      </p>
    </div>
  );
}
