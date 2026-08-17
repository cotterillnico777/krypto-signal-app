import Link from "next/link";
import Head from "next/head";
import { getRedis } from "../lib/redis";
import { useLanguage } from "../lib/i18n";
import LanguageToggle from "../components/LanguageToggle";

const SITE_URL = "https://krypto-signal-app.vercel.app";

// Bewusst KEIN getServerSideProps = requireActiveAccess -- öffentliche
// Vertrauens-/Marketing-Seite (gleiches Muster wie pages/validation.js),
// gedacht für Besucher VOR der Anmeldung. Liest NUR einen von
// pages/api/cron/refresh-track-record.js vorberechneten Redis-Snapshot,
// löst nie selbst einen Backtest aus (siehe Kommentar dort für die
// Kosten-/Abuse-Begründung).
export async function getServerSideProps() {
  const redis = getRedis();
  const snapshot = redis ? await redis.get("track-record:snapshot") : null;
  return { props: { snapshot: snapshot ?? null } };
}

function fmtPct(n) {
  return n == null ? "n/a" : `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default function TrackRecord({ snapshot }) {
  const { t, lang } = useLanguage();
  const description = snapshot
    ? t("trackrecord.metaDescriptionWithData", {
        returnPct: fmtPct(snapshot.portfolio.totalReturnPct),
        buyHoldPct: fmtPct(snapshot.portfolio.buyHoldReturnPct),
        maxDrawdown: snapshot.portfolio.maxDrawdown.toFixed(1),
      })
    : t("trackrecord.metaDescriptionNoData");
  const ogImage = `${SITE_URL}/api/og/track-record`;
  const pageTitle = t("trackrecord.pageTitle");

  return (
    <div className="container">
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/track-record`} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: "0.75rem" }}>
        <div className="brand" style={{ marginBottom: 0 }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>{t("trackrecord.h1")}</h1>
            <p className="subtitle">{t("trackrecord.subtitle")}</p>
          </div>
        </div>
        <LanguageToggle />
      </div>

      {!snapshot ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p className="note">{t("trackrecord.computing")}</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p>
              {t("trackrecord.introPre", {
                days: snapshot.days,
                coinCount: snapshot.coins.length,
                coins: snapshot.coins.join(", "),
                date: new Date(snapshot.computedAt).toLocaleDateString(lang === "de" ? "de-DE" : "en-GB"),
              })}
            </p>
          </div>

          <p className="section-title" style={{ marginBottom: 10 }}>{t("trackrecord.portfolioSectionTitle")}</p>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">{t("trackrecord.portfolioReturn")}</p>
              <p className="card-value" style={{ color: snapshot.portfolio.totalReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtPct(snapshot.portfolio.totalReturnPct)}</p>
              <p className="note">{t("trackrecord.buyHold", { value: fmtPct(snapshot.portfolio.buyHoldReturnPct) })}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("trackrecord.maxDrawdown")}</p>
              <p className="card-value" style={{ color: "var(--red-text)" }}>{snapshot.portfolio.maxDrawdown.toFixed(1)}%</p>
              <p className="note">{t("trackrecord.maxDrawdownNote")}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("trackrecord.sharpeRatio")}</p>
              <p className="card-value">{snapshot.portfolio.sharpe != null ? snapshot.portfolio.sharpe.toFixed(2) : "n/a"}</p>
              <p className="note">{t("trackrecord.tradeCount", { count: snapshot.portfolio.tradeCount })}</p>
            </div>
          </div>

          <p className="section-title" style={{ marginBottom: 10 }}>{t("trackrecord.walkForwardTitle")}</p>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">{t("trackrecord.avgOosReturn")}</p>
              <p className="card-value" style={{ color: snapshot.walkForward.avgOosReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtPct(snapshot.walkForward.avgOosReturnPct)}</p>
              <p className="note">{t("trackrecord.avgOosReturnNote")}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("trackrecord.avgOosSharpe")}</p>
              <p className="card-value">{snapshot.walkForward.avgOosSharpe != null ? snapshot.walkForward.avgOosSharpe.toFixed(2) : "n/a"}</p>
            </div>
            <div className="card">
              <p className="card-label">{t("trackrecord.profitableFolds")}</p>
              <p className="card-value">{snapshot.walkForward.profitableFolds}/{snapshot.walkForward.foldCount}</p>
              <p className="note">{t("trackrecord.profitableFoldsNote", { total: snapshot.walkForward.foldCount })}</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="note">
              {t("trackrecord.footnotePre")}
              <Link href="/validation">{t("trackrecord.footnoteLink")}</Link>
              {t("trackrecord.footnotePost")}
            </p>
          </div>
        </>
      )}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>{t("common.tryYourself")}</p>
        <p className="note" style={{ justifyContent: "center", marginBottom: 14 }}>{t("common.trialFree")}.</p>
        <Link href="/signup" className="icon-btn primary">{t("common.signupCta")}</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          {t("common.alreadyAccount")}
          <Link href="/login">{t("common.login")}</Link>
        </p>
      </div>
    </div>
  );
}
