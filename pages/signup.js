import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { getSupabaseBrowserClient } from "../lib/supabase/client";
import { useLanguage } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

export default function Signup() {
  const router = useRouter();
  const { t } = useLanguage();
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
      setError(err.message || t("signup.errorGeneric"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "1.5rem" }}>
          <div className="brand" style={{ marginBottom: 0 }}>
            <div className="brand-mark">₿</div>
            <div>
              <h1>{t("signup.title")}</h1>
              <p className="subtitle">{t("common.trialFree")}</p>
            </div>
          </div>
          <LanguageToggle />
        </div>

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
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
            </label>
            {error && <div className="error-box">{error}</div>}
            <button className="icon-btn primary" type="submit" disabled={busy}>
              {busy ? "…" : t("signup.submit")}
            </button>
          </form>
        )}

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
      </div>
    </div>
  );
}
