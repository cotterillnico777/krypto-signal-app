import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const redirect = typeof router.query.redirect === "string" ? router.query.redirect : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  function callbackUrl() {
    const origin = window.location.origin;
    return `${origin}/api/auth/callback?redirect=${encodeURIComponent(redirect)}`;
  }

  async function handlePasswordLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      router.push(redirect);
    } catch (err) {
      setError(err.message || "Anmeldung fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Bitte E-Mail-Adresse eingeben.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: callbackUrl() } });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err.message || "Magic Link konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setBusy(true);
    setError(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo: callbackUrl() } });
      if (error) throw error;
    } catch (err) {
      setError(err.message || "Google-Anmeldung fehlgeschlagen.");
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div className="brand" style={{ marginBottom: "1.5rem" }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>Anmelden</h1>
            <p className="subtitle">Krypto Signal Dashboard</p>
          </div>
        </div>

        {magicSent ? (
          <p>
            Wir haben dir einen Anmelde-Link an <strong>{email}</strong> geschickt. Bitte E-Mail-Postfach prüfen.
          </p>
        ) : (
          <>
            <form className="auth-form" onSubmit={handlePasswordLogin}>
              <label>
                E-Mail
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label>
                Passwort
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
              </label>
              {error && <div className="error-box">{error}</div>}
              <button className="icon-btn primary" type="submit" disabled={busy}>
                {busy ? "…" : "Anmelden"}
              </button>
            </form>
            <button className="icon-btn" onClick={handleMagicLink} disabled={busy} style={{ marginTop: "0.75rem", width: "100%" }}>
              ✉️ Magic Link stattdessen senden
            </button>
            <button className="icon-btn" onClick={handleGoogle} disabled={busy} style={{ marginTop: "0.5rem", width: "100%" }}>
              Mit Google anmelden
            </button>
          </>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: 13 }}>
          Noch keinen Account? <Link href="/signup">Jetzt registrieren</Link> (14 Tage kostenlos testen, keine Kreditkarte nötig)
        </p>
      </div>
    </div>
  );
}
