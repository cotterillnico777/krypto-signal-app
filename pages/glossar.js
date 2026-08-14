import Link from "next/link";
import { GLOSSARY } from "../lib/glossary";

// Bewusst KEIN getServerSideProps = requireActiveAccess -- öffentliche
// Lern-Seite, gleiches Muster wie pages/validation.js: eigener schlanker
// .brand-Header statt AppHeader, erreichbar auch ohne Login. Pull-Faktor #3
// für Retail-/Neuling-Investoren -- mehr Tiefe als die Dashboard-Tooltips
// erlauben, ohne die Erklärungen dort aufzublähen.
export default function Glossar() {
  return (
    <div className="container">
      <div className="brand" style={{ marginBottom: "0.75rem" }}>
        <div className="brand-mark">₿</div>
        <div>
          <h1>Glossar &amp; wie wir arbeiten</h1>
          <p className="subtitle">Alle Fachbegriffe aus dem Dashboard einmal ausführlich erklärt -- keine Vorkenntnisse nötig.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p>
          Diese App zeigt technische und wirtschaftliche Kennzahlen, die im Trading üblich, für Einsteiger aber oft unbekannt sind. Diese Seite erklärt jeden Begriff in einfachen Worten -- ausführlicher, als es im Dashboard selbst per Tooltip möglich ist. Wer wissen will, WARUM sich die App auf diese Faktoren verlässt (und welche sie bewusst NICHT nutzt), findet das auf der{" "}
          <Link href="/validation">Validierungs-Historie</Link>-Seite.
        </p>
      </div>

      {GLOSSARY.map((group) => (
        <div key={group.category} style={{ marginBottom: "1.75rem" }}>
          <p className="section-title" style={{ fontSize: 15, marginBottom: 10 }}>{group.category}</p>
          {group.terms.map((t) => (
            <div className="card" key={t.term} style={{ marginBottom: "0.75rem" }}>
              <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 6 }}>{t.term}</p>
              <p style={{ fontSize: 13.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>{t.explanation}</p>
            </div>
          ))}
        </div>
      ))}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>Bereit, es selbst auszuprobieren?</p>
        <p className="note" style={{ justifyContent: "center", marginBottom: 14 }}>14 Tage kostenlos testen, keine Kreditkarte nötig.</p>
        <Link href="/signup" className="icon-btn primary">Jetzt registrieren</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Schon einen Account? <Link href="/login">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
