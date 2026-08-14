import Link from "next/link";
import { VALIDATION_HISTORY } from "../lib/validationHistory";

// Bewusst KEIN getServerSideProps = requireActiveAccess -- diese Seite ist
// die einzige inhaltliche öffentliche Seite der App (neben login.js/signup.js/
// upgrade.js), gedacht als Vertrauensanker für Interessenten VOR der
// Anmeldung. Folgt deshalb dem Layout-Muster von login.js (eigener
// schlanker .brand-Header) statt AppHeader (kein Tool-Nav, kein Logout-
// Button, da Besucher hier meist nicht eingeloggt sind).

const OUTCOME = {
  adopted: { cls: "badge-green", label: "Übernommen" },
  confirmed: { cls: "badge-green", label: "Bleibt aktiv" },
  rejected: { cls: "badge-gray", label: "Kein Effekt gefunden" },
  harmful: { cls: "badge-red", label: "Schadet mehr als es hilft" },
  optional: { cls: "badge-amber", label: "Gemischt — optional verfügbar" },
};

function fmtDate(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

export default function Validation() {
  return (
    <div className="container">
      <div className="brand" style={{ marginBottom: "0.75rem" }}>
        <div className="brand-mark">₿</div>
        <div>
          <h1>Wie wir unsere Signale entwickeln</h1>
          <p className="subtitle">Jeder neue Faktor wird empirisch getestet, bevor er live einfließt — auch wenn das Ergebnis "hilft nicht" lautet.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p>
          Bevor ein neuer Faktor (ein Indikator, eine Makro-Kennzahl, eine Gewichtung) die Kaufen/Verkaufen-Entscheidung im Dashboard beeinflusst, testen wir ihn per <strong>Multi-Coin Walk-Forward-Validierung</strong>: die Strategie wird über mehrere unabhängige Zeitfenster (in der Regel 365, 730 und 850 Tage, über alle fünf gehandelten Coins) auf Daten getestet, die sie beim Training nie gesehen hat. Nur wenn sich ein robuster Vorteil über mehrere Fenster hinweg zeigt, wird ein Faktor standardmäßig aktiviert.
        </p>
        <p className="note" style={{ marginTop: 10 }}>
          Die Liste unten zeigt <strong>alle</strong> bisher getesteten Faktoren — auch die, die nicht geholfen oder sogar geschadet haben. Kein Cherry-Picking.
        </p>
        <p className="note" style={{ marginTop: 6 }}>
          Fachbegriffe unbekannt? <Link href="/glossar">Glossar mit allen Begriffen →</Link>
        </p>
      </div>

      {VALIDATION_HISTORY.map((entry) => {
        const outcome = OUTCOME[entry.outcome];
        return (
          <div className="card" key={entry.id} style={{ marginBottom: "1rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
              <p className="section-title" style={{ margin: 0, fontSize: 15 }}>{entry.factor}</p>
              <span className={`badge ${outcome.cls}`}>{outcome.label}</span>
            </div>
            <p className="note" style={{ marginBottom: 8 }}>{fmtDate(entry.date)}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>Hypothese:</strong> {entry.hypothesis}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)", marginBottom: 6 }}><strong style={{ color: "var(--text)" }}>Methode:</strong> {entry.method}</p>
            <p style={{ fontSize: 13.5, color: "var(--text-muted)" }}><strong style={{ color: "var(--text)" }}>Ergebnis:</strong> {entry.result}</p>
          </div>
        );
      })}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>Selbst ausprobieren?</p>
        <p className="note" style={{ justifyContent: "center", marginBottom: 14 }}>14 Tage kostenlos testen, keine Kreditkarte nötig.</p>
        <Link href="/signup" className="icon-btn primary">Jetzt registrieren</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Schon einen Account? <Link href="/login">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
