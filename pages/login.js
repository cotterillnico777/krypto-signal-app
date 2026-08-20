import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useLanguage, translateAuthError } from "../lib/i18n";
import Logo from "../components/Logo";
import LanguageToggle from "../components/LanguageToggle";

export default function Login() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const redirect = typeof router.query.redirect === "string" ? router.query.redirect : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [magicSent, setMagicSent] = useState(false);

  // pages/api/auth/callback.js hängt bei einem ungültigen/abgelaufenen
  // Magic-Link/OAuth-Code ?authError=link_invalid an den Redirect zurück
  // zu /login -- sonst würde der Nutzer kommentarlos zurück auf /login
  // landen, ohne zu wissen warum ("localhost refused to connect"-artige
  // Verwirrung, nur eben als stille Endlosschleife statt Fehlerseite).
  useEffect(() => {
    if (router.query.authError) setError(translateAuthError(String(router.query.authError), lang));
  }, [router.query.authError, lang]);

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
      setError(translateAuthError(err.message, lang));
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError(t("login.errorEmailRequired"));
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
      setError(translateAuthError(err.message, lang));
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
      setError(translateAuthError(err.message, lang));
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1.5rem" }}>
          <div className="brand" style={{ marginBottom: 0 }}>
            <Logo size={40} />
            <div>
              <h1>{t("login.title")}</h1>
              <p className="subtitle">{t("common.tagline")}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>
        <p className="note" style={{ marginBottom: "1rem" }}>{t("common.positioningNote")}</p>

        {magicSent ? (
          <p>{t("login.magicSent", { email })}</p>
        ) : (
          <>
            <form className="auth-form" onSubmit={handlePasswordLogin}>
              <label>
                {t("login.emailLabel")}
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </label>
              <label>
                {t("login.passwordLabel")}
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    style={{ flex: 1 }}
                  />
                  <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)} style={{ padding: "9px 12px", fontSize: 12 }}>
                    {showPassword ? t("common.hidePassword") : t("common.showPassword")}
                  </button>
                </div>
              </label>
              {error && <div className="error-box">{error}</div>}
              <button className="icon-btn primary" type="submit" disabled={busy}>
                {busy ? "…" : t("login.submit")}
              </button>
            </form>
            <button className="icon-btn" onClick={handleMagicLink} disabled={busy} style={{ marginTop: "0.75rem", width: "100%" }}>
              {t("login.magicLinkBtn")}
            </button>
            <button className="icon-btn" onClick={handleGoogle} disabled={busy} style={{ marginTop: "0.5rem", width: "100%" }}>
              {t("login.googleBtn")}
            </button>
          </>
        )}

        <p style={{ marginTop: "1.5rem", fontSize: 13 }}>
          {t("login.noAccount")}
          <Link href="/signup">{t("common.signupCta")}</Link>
          {t("login.noAccountSuffix")}
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/track-record">{t("common.trackRecordLink")}</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/validation">{t("common.validationLink")}</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/glossar">{t("common.glossaryLink")}</Link>
        </p>
        <p style={{ marginTop: "1rem", fontSize: 12, color: "var(--text-muted)" }}>
          {t("signup.legalIntro")}{" "}
          <Link href="/datenschutz">{t("common.privacyLink")}</Link>
          {" · "}
          <Link href="/impressum">{t("common.imprintLink")}</Link>
          {" · "}
          <Link href="/agb">{t("common.termsLink")}</Link>
          {" · "}
          <Link href="/risikohinweis">{t("common.riskLink")}</Link>
        </p>
      </div>
    </div>
  );
}
