import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function Signup() {
  const router = useRouter();
  const refCode = typeof router.query.ref === "string" ? router.query.ref : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${origin}/api/auth/callback`,
          // Landet in auth.users.raw_user_meta_data -- der DB-Trigger
          // handle_new_user() (supabase/migrations/0003_referrals.sql) liest
          // das beim Anlegen des profiles-Eintrags aus und vergibt den
          // Trial-Bonus für beide Seiten.
          ...(refCode ? { data: { ref_code: refCode } } : {}),
        },
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(err.message || "Registrierung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div className="brand" style={{ marginBottom: "1.5rem" }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>Account erstellen</h1>
            <p className="subtitle">14 Tage kostenlos testen, keine Kreditkarte nötig</p>
          </div>
        </div>

        {refCode && (
          <div className="note" style={{ background: "var(--bg-subtle)", borderRadius: 6, padding: "8px 10px", marginBottom: "1rem" }}>
            🎁 Du wurdest eingeladen -- du bekommst 7 Tage extra Trial (21 statt 14 Tage)!
          </div>
        )}

        <ul style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 1.5rem", paddingLeft: 18 }}>
          <li>Jedes Signal kommt mit einer Klartext-Begründung statt einer Blackbox-Empfehlung</li>
          <li>Keine Vorkenntnisse nötig -- Fachbegriffe wie RSI oder MACD werden direkt erklärt, <Link href="/glossar">ausführliches Glossar</Link> inklusive</li>
          <li>Volle Transparenz: <Link href="/validation">wie wir unsere Signale entwickeln →</Link></li>
        </ul>

        {done ? (
          <p>
            Fast geschafft — wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> geschickt. Bitte den Link darin anklicken, um deine Testphase zu starten.
          </p>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
            <label>
              E-Mail
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
            </label>
            <label>
              Passwort
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="icon-btn primary" type="submit" disabled={busy}>
              {busy ? "…" : "Kostenlos registrieren"}
            </button>
          </form>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: 13 }}>
          Schon registriert? <Link href="/login">Anmelden</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/validation">Wie wir unsere Signale entwickeln →</Link>
        </p>
      </div>
    </div>
  );
}
