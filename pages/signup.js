import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useLanguage, translateAuthError } from "../lib/i18n";
import Logo from "../components/Logo";
import LanguageToggle from "../components/LanguageToggle";

export default function Signup() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const refCode = typeof router.query.ref === "string" ? router.query.ref : null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [done, setDone] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError(t("signup.passwordTooShort"));
      return;
    }
    setBusy(true);
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
      setError(translateAuthError(err.message, lang));
    } finally {
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
              <h1>{t("signup.title")}</h1>
              <p className="subtitle">{t("common.tagline")}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>
        <p className="note" style={{ marginBottom: "1rem" }}>{t("common.positioningNote")}</p>

        {refCode && (
          <div className="note" style={{ background: "var(--bg-subtle)", borderRadius: 6, padding: "8px 10px", marginBottom: "1rem" }}>
            {t("signup.refBonus")}
          </div>
        )}

        <ul style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, margin: "0 0 1.5rem", paddingLeft: 18 }}>
          <li>{t("signup.bullet1")}</li>
          <li>
            {t("signup.bullet2Pre")}
            <Link href="/glossar">{t("signup.bullet2Link")}</Link>
            {t("signup.bullet2Post")}
          </li>
          <li>
            {t("signup.bullet3Pre")}
            <Link href="/validation">{t("common.validationLink")}</Link>
          </li>
        </ul>

        {done ? (
          <p>{t("signup.done", { email })}</p>
        ) : (
          <form className="auth-form" onSubmit={handleSignup}>
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
                  minLength={6}
                  autoComplete="new-password"
                  style={{ flex: 1 }}
                />
                <button type="button" className="icon-btn" onClick={() => setShowPassword((v) => !v)} style={{ padding: "9px 12px", fontSize: 12 }}>
                  {showPassword ? t("common.hidePassword") : t("common.showPassword")}
                </button>
              </div>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>{t("signup.passwordRequirement")}</span>
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="icon-btn primary" type="submit" disabled={busy}>
              {busy ? "…" : t("signup.submit")}
            </button>
          </form>
        )}

        <p className="note" style={{ marginTop: "1rem" }}>{t("common.trialFreeNoCard")}</p>
        <p className="note" style={{ marginTop: 6 }}>{t("signup.afterTrial")}</p>

        <p style={{ marginTop: "1.5rem", fontSize: 13 }}>
          {t("signup.alreadyRegistered")}
          <Link href="/login">{t("common.login")}</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/track-record">{t("common.trackRecordLink")}</Link>
        </p>
        <p style={{ marginTop: "0.5rem", fontSize: 13 }}>
          <Link href="/validation">{t("common.validationLink")}</Link>
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
