import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function Signup() {
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
        options: { emailRedirectTo: `${origin}/api/auth/callback` },
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
