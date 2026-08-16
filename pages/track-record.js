import Link from "next/link";
import Head from "next/head";
import { getRedis } from "../lib/redis";

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
  const description = snapshot
    ? `Portfolio-Backtest: ${fmtPct(snapshot.portfolio.totalReturnPct)} (Buy&Hold: ${fmtPct(snapshot.portfolio.buyHoldReturnPct)}), Max Drawdown ${snapshot.portfolio.maxDrawdown.toFixed(1)}% -- echte Zahlen, nichts geschönt.`
    : "Echte, laufend aktualisierte Backtest-Ergebnisse der Krypto-Signal-Dashboard-Standardstrategie.";
  const ogImage = `${SITE_URL}/api/og/track-record`;

  return (
    <div className="container">
      <Head>
        <title>Live-Track-Record -- Krypto Signal Dashboard</title>
        <meta name="description" content={description} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Live-Track-Record -- Krypto Signal Dashboard" />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={`${SITE_URL}/track-record`} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Live-Track-Record -- Krypto Signal Dashboard" />
        <meta name="twitter:description" content={description} />
        <meta name="twitter:image" content={ogImage} />
      </Head>

      <div className="brand" style={{ marginBottom: "0.75rem" }}>
        <div className="brand-mark">₿</div>
        <div>
          <h1>Live-Track-Record</h1>
          <p className="subtitle">Echte, laufend aktualisierte Backtest-Ergebnisse der Standard-Strategie — inklusive der schlechten Zahlen.</p>
        </div>
      </div>

      {!snapshot ? (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <p className="note">Der erste Snapshot wird gerade berechnet -- bitte in Kürze erneut vorbeischauen.</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p>
              Alle Zahlen unten stammen aus den <strong>echten Backtest-/Walk-Forward-Werkzeugen dieser App</strong> (dieselben, die auch eingeloggte Nutzer unter "Portfolio" und "Walk-Forward" sehen) -- keine geschönte Marketing-Zahl, keine Cherry-Picked-Kombination. Standardeinstellungen, {snapshot.days} Tage, alle {snapshot.coins.length} gehandelten Coins ({snapshot.coins.join(", ")}). Zuletzt berechnet: {new Date(snapshot.computedAt).toLocaleDateString("de-DE")}.
            </p>
          </div>

          <p className="section-title" style={{ marginBottom: 10 }}>💼 Portfolio-Backtest (gleichgewichtet, kein Rebalancing)</p>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">Portfolio-Rendite</p>
              <p className="card-value" style={{ color: snapshot.portfolio.totalReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtPct(snapshot.portfolio.totalReturnPct)}</p>
              <p className="note">Buy&amp;Hold: {fmtPct(snapshot.portfolio.buyHoldReturnPct)}</p>
            </div>
            <div className="card">
              <p className="card-label">Max Drawdown</p>
              <p className="card-value" style={{ color: "var(--red-text)" }}>{snapshot.portfolio.maxDrawdown.toFixed(1)}%</p>
              <p className="note">Größter zwischenzeitlicher Verlust -- bewusst nicht versteckt</p>
            </div>
            <div className="card">
              <p className="card-label">Sharpe Ratio</p>
              <p className="card-value">{snapshot.portfolio.sharpe != null ? snapshot.portfolio.sharpe.toFixed(2) : "n/a"}</p>
              <p className="note">{snapshot.portfolio.tradeCount} Trades insgesamt</p>
            </div>
          </div>

          <p className="section-title" style={{ marginBottom: 10 }}>🔬 Multi-Coin Walk-Forward (Out-of-Sample, das strengste Verfahren der App)</p>
          <div className="grid grid-3" style={{ marginBottom: "1.5rem" }}>
            <div className="card">
              <p className="card-label">Ø Out-of-Sample-Rendite</p>
              <p className="card-value" style={{ color: snapshot.walkForward.avgOosReturnPct >= 0 ? "var(--green-text)" : "var(--red-text)" }}>{fmtPct(snapshot.walkForward.avgOosReturnPct)}</p>
              <p className="note">Auf Daten, die die Strategie beim Training nie gesehen hat</p>
            </div>
            <div className="card">
              <p className="card-label">Ø Out-of-Sample-Sharpe</p>
              <p className="card-value">{snapshot.walkForward.avgOosSharpe != null ? snapshot.walkForward.avgOosSharpe.toFixed(2) : "n/a"}</p>
            </div>
            <div className="card">
              <p className="card-label">Profitable Fenster</p>
              <p className="card-value">{snapshot.walkForward.profitableFolds}/{snapshot.walkForward.foldCount}</p>
              <p className="note">Wie viele der {snapshot.walkForward.foldCount} unabhängigen Test-Fenster im Plus lagen</p>
            </div>
          </div>

          <div className="card" style={{ marginBottom: "1.5rem" }}>
            <p className="note">
              Diese Zahlen sind die aktuelle Standard-Konfiguration -- <Link href="/validation">jeder Faktor, der je zur Diskussion stand, wurde einzeln empirisch getestet</Link>, inklusive der vielen, die NICHT geholfen haben und deshalb nicht aktiv sind. Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.
            </p>
          </div>
        </>
      )}

      <div className="card" style={{ textAlign: "center", padding: "1.75rem" }}>
        <p className="section-title" style={{ fontSize: 16 }}>Selbst ausprobieren?</p>
        <p className="note" style={{ justifyContent: "center", marginBottom: 14 }}>14 Tage kostenlos testen.</p>
        <Link href="/signup" className="icon-btn primary">Jetzt registrieren</Link>
        <p style={{ marginTop: 12, fontSize: 13 }}>
          Schon einen Account? <Link href="/login">Anmelden</Link>
        </p>
      </div>
    </div>
  );
}
