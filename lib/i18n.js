// Leichtgewichtiges i18n für die öffentlichen Marketing-/Auth-Seiten
// (login/signup/track-record/validation/glossar/upgrade). Bewusst kein
// next-i18next o.ä. -- nur diese 6 Seiten brauchen aktuell Übersetzung,
// ein React-Context mit einer einzigen TRANSLATIONS-Tabelle reicht dafür.
// Gegatete Seiten (AppHeader-Bereich) bleiben unangetastet Deutsch.
import { createContext, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "ksd-lang";

function detectInitialLang() {
  if (typeof window === "undefined") return "de";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "de" || stored === "en") return stored;
  const browserLang = (navigator.language || navigator.languages?.[0] || "de").toLowerCase();
  return browserLang.startsWith("de") ? "de" : "en";
}

function resolvePath(obj, path) {
  return path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => (vars[key] != null ? String(vars[key]) : ""));
}

const TRANSLATIONS = {
  common: {
    login: { de: "Anmelden", en: "Log in" },
    logout: { de: "Abmelden", en: "Log out" },
    signupCta: { de: "Jetzt registrieren", en: "Sign up now" },
    trialFree: { de: "14 Tage kostenlos testen", en: "Try free for 14 days" },
    trialFreeNoCard: { de: "14 Tage kostenlos testen, keine Kreditkarte nötig.", en: "Try free for 14 days, no credit card required." },
    alreadyAccount: { de: "Schon einen Account? ", en: "Already have an account? " },
    tryYourself: { de: "Selbst ausprobieren?", en: "Want to try it yourself?" },
    trackRecordLink: { de: "Live-Track-Record: echte Backtest-Zahlen →", en: "Live track record: real backtest numbers →" },
    validationLink: { de: "Wie wir unsere Signale entwickeln →", en: "How we develop our signals →" },
    glossaryLink: { de: "Glossar: RSI, MACD & Co. erklärt →", en: "Glossary: RSI, MACD & more explained →" },
    appName: { de: "Krypto Signal Dashboard", en: "Krypto Signal Dashboard" },
  },
  login: {
    errorGeneric: { de: "Anmeldung fehlgeschlagen.", en: "Login failed." },
    errorEmailRequired: { de: "Bitte E-Mail-Adresse eingeben.", en: "Please enter your email address." },
    errorMagicFailed: { de: "Magic Link konnte nicht gesendet werden.", en: "Could not send magic link." },
    errorGoogleFailed: { de: "Google-Anmeldung fehlgeschlagen.", en: "Google sign-in failed." },
    title: { de: "Anmelden", en: "Log in" },
    magicSent: { de: "Wir haben dir einen Anmelde-Link an {{email}} geschickt. Bitte E-Mail-Postfach prüfen.", en: "We've sent a login link to {{email}}. Please check your inbox." },
    emailLabel: { de: "E-Mail", en: "Email" },
    passwordLabel: { de: "Passwort", en: "Password" },
    submit: { de: "Anmelden", en: "Log in" },
    magicLinkBtn: { de: "✉️ Magic Link stattdessen senden", en: "✉️ Send magic link instead" },
    googleBtn: { de: "Mit Google anmelden", en: "Sign in with Google" },
    noAccount: { de: "Noch keinen Account? ", en: "Don't have an account yet? " },
    noAccountSuffix: { de: " (14 Tage kostenlos testen, keine Kreditkarte nötig)", en: " (try free for 14 days, no credit card required)" },
  },
  signup: {
    errorGeneric: { de: "Registrierung fehlgeschlagen.", en: "Sign-up failed." },
    title: { de: "Account erstellen", en: "Create account" },
    refBonus: { de: "🎁 Du wurdest eingeladen -- du bekommst 7 Tage extra Trial (21 statt 14 Tage)!", en: "🎁 You were invited -- you get 7 extra trial days (21 instead of 14)!" },
    bullet1: { de: "Jedes Signal kommt mit einer Klartext-Begründung statt einer Blackbox-Empfehlung", en: "Every signal comes with a plain-language explanation instead of a black-box recommendation" },
    bullet2Pre: { de: "Keine Vorkenntnisse nötig -- Fachbegriffe wie RSI oder MACD werden direkt erklärt, ", en: "No prior knowledge needed -- terms like RSI or MACD are explained right away, " },
    bullet2Link: { de: "ausführliches Glossar", en: "detailed glossary" },
    bullet2Post: { de: " inklusive", en: " included" },
    bullet3Pre: { de: "Volle Transparenz: ", en: "Full transparency: " },
    done: { de: "Fast geschafft — wir haben eine Bestätigungs-E-Mail an {{email}} geschickt. Bitte den Link darin anklicken, um deine Testphase zu starten.", en: "Almost there — we've sent a confirmation email to {{email}}. Please click the link inside to start your trial." },
    submit: { de: "Kostenlos registrieren", en: "Sign up for free" },
    alreadyRegistered: { de: "Schon registriert? ", en: "Already registered? " },
  },
  trackrecord: {
    metaDescriptionWithData: { de: "Portfolio-Backtest: {{returnPct}} (Buy&Hold: {{buyHoldPct}}), Max Drawdown {{maxDrawdown}}% -- echte Zahlen, nichts geschönt.", en: "Portfolio backtest: {{returnPct}} (buy & hold: {{buyHoldPct}}), max drawdown {{maxDrawdown}}% -- real numbers, nothing embellished." },
    metaDescriptionNoData: { de: "Echte, laufend aktualisierte Backtest-Ergebnisse der Krypto-Signal-Dashboard-Standardstrategie.", en: "Real, continuously updated backtest results of the Krypto Signal Dashboard's default strategy." },
    pageTitle: { de: "Live-Track-Record -- Krypto Signal Dashboard", en: "Live Track Record -- Krypto Signal Dashboard" },
    h1: { de: "Live-Track-Record", en: "Live Track Record" },
    subtitle: { de: "Echte, laufend aktualisierte Backtest-Ergebnisse der Standard-Strategie — inklusive der schlechten Zahlen.", en: "Real, continuously updated backtest results of the default strategy — including the bad numbers." },
    computing: { de: "Der erste Snapshot wird gerade berechnet -- bitte in Kürze erneut vorbeischauen.", en: "The first snapshot is being computed right now -- please check back shortly." },
    introPre: { de: "Alle Zahlen unten stammen aus den echten Backtest-/Walk-Forward-Werkzeugen dieser App (dieselben, die auch eingeloggte Nutzer unter \"Portfolio\" und \"Walk-Forward\" sehen) -- keine geschönte Marketing-Zahl, keine Cherry-Picked-Kombination. Standardeinstellungen, {{days}} Tage, alle {{coinCount}} gehandelten Coins ({{coins}}). Zuletzt berechnet: {{date}}.", en: "All numbers below come from this app's real backtest/walk-forward tools (the same ones logged-in users see under \"Portfolio\" and \"Walk-Forward\") -- no polished marketing number, no cherry-picked combination. Default settings, {{days}} days, all {{coinCount}} traded coins ({{coins}}). Last computed: {{date}}." },
    portfolioSectionTitle: { de: "💼 Portfolio-Backtest (gleichgewichtet, kein Rebalancing)", en: "💼 Portfolio backtest (equal-weighted, no rebalancing)" },
    portfolioReturn: { de: "Portfolio-Rendite", en: "Portfolio return" },
    buyHold: { de: "Buy&Hold: {{value}}", en: "Buy & hold: {{value}}" },
    maxDrawdown: { de: "Max Drawdown", en: "Max drawdown" },
    maxDrawdownNote: { de: "Größter zwischenzeitlicher Verlust -- bewusst nicht versteckt", en: "Largest interim loss -- deliberately not hidden" },
    sharpeRatio: { de: "Sharpe Ratio", en: "Sharpe ratio" },
    tradeCount: { de: "{{count}} Trades insgesamt", en: "{{count}} trades total" },
    walkForwardTitle: { de: "🔬 Multi-Coin Walk-Forward (Out-of-Sample, das strengste Verfahren der App)", en: "🔬 Multi-coin walk-forward (out-of-sample, the app's strictest method)" },
    avgOosReturn: { de: "Ø Out-of-Sample-Rendite", en: "Avg. out-of-sample return" },
    avgOosReturnNote: { de: "Auf Daten, die die Strategie beim Training nie gesehen hat", en: "On data the strategy never saw during training" },
    avgOosSharpe: { de: "Ø Out-of-Sample-Sharpe", en: "Avg. out-of-sample Sharpe" },
    profitableFolds: { de: "Profitable Fenster", en: "Profitable windows" },
    profitableFoldsNote: { de: "Wie viele der {{total}} unabhängigen Test-Fenster im Plus lagen", en: "How many of the {{total}} independent test windows were profitable" },
    footnotePre: { de: "Diese Zahlen sind die aktuelle Standard-Konfiguration -- ", en: "These numbers reflect the current default configuration -- " },
    footnoteLink: { de: "jeder Faktor, der je zur Diskussion stand, wurde einzeln empirisch getestet", en: "every factor ever considered was individually tested empirically" },
    footnotePost: { de: ", inklusive der vielen, die NICHT geholfen haben und deshalb nicht aktiv sind. Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.", en: ", including the many that did NOT help and are therefore not active. Past performance is no guarantee of future results. Not investment advice." },
  },
  validation: {
    h1: { de: "Wie wir unsere Signale entwickeln", en: "How we develop our signals" },
    subtitle: { de: "Jeder neue Faktor wird empirisch getestet, bevor er live einfließt — auch wenn das Ergebnis \"hilft nicht\" lautet.", en: "Every new factor is empirically tested before it goes live — even when the result is \"doesn't help\"." },
    intro: { de: "Bevor ein neuer Faktor (ein Indikator, eine Makro-Kennzahl, eine Gewichtung) die Kaufen/Verkaufen-Entscheidung im Dashboard beeinflusst, testen wir ihn per Multi-Coin Walk-Forward-Validierung: die Strategie wird über mehrere unabhängige Zeitfenster (in der Regel 365, 730 und 850 Tage, über alle fünf gehandelten Coins) auf Daten getestet, die sie beim Training nie gesehen hat. Nur wenn sich ein robuster Vorteil über mehrere Fenster hinweg zeigt, wird ein Faktor standardmäßig aktiviert.", en: "Before a new factor (an indicator, a macro metric, a weighting) can influence the buy/sell decision in the dashboard, we test it via multi-coin walk-forward validation: the strategy is tested over several independent time windows (typically 365, 730, and 850 days, across all five traded coins) on data it never saw during training. Only if a robust advantage shows up across multiple windows does a factor get enabled by default." },
    introNotePre: { de: "Die Liste unten zeigt alle bisher getesteten Faktoren — auch die, die nicht geholfen oder sogar geschadet haben. Kein Cherry-Picking.", en: "The list below shows every factor tested so far — including the ones that didn't help or even hurt. No cherry-picking." },
    introGlossaryPre: { de: "Fachbegriffe unbekannt? ", en: "Unfamiliar terms? " },
    introGlossaryLink: { de: "Glossar mit allen Begriffen →", en: "Glossary with all terms →" },
    hypothesisLabel: { de: "Hypothese:", en: "Hypothesis:" },
    methodLabel: { de: "Methode:", en: "Method:" },
    resultLabel: { de: "Ergebnis:", en: "Result:" },
    tryYourself: { de: "Selbst ausprobieren?", en: "Want to try it yourself?" },
  },
  glossar: {
    h1: { de: "Glossar & wie wir arbeiten", en: "Glossary & how we work" },
    subtitle: { de: "Alle Fachbegriffe aus dem Dashboard einmal ausführlich erklärt -- keine Vorkenntnisse nötig.", en: "Every technical term from the dashboard explained in full -- no prior knowledge needed." },
    introPre: { de: "Diese App zeigt technische und wirtschaftliche Kennzahlen, die im Trading üblich, für Einsteiger aber oft unbekannt sind. Diese Seite erklärt jeden Begriff in einfachen Worten -- ausführlicher, als es im Dashboard selbst per Tooltip möglich ist. Wer wissen will, WARUM sich die App auf diese Faktoren verlässt (und welche sie bewusst NICHT nutzt), findet das auf der ", en: "This app shows technical and economic metrics that are common in trading but often unfamiliar to beginners. This page explains every term in plain language -- in more depth than the dashboard's own tooltips allow. Anyone who wants to know WHY the app relies on these factors (and which ones it deliberately does NOT use) can find that on the " },
    introLink: { de: "Validierungs-Historie", en: "validation history" },
    introPost: { de: "-Seite.", en: " page." },
    ready: { de: "Bereit, es selbst auszuprobieren?", en: "Ready to try it yourself?" },
  },
  upgrade: {
    title: { de: "Testphase abgelaufen", en: "Trial expired" },
    body: { de: "Deine 14-tägige kostenlose Testphase ist vorbei. Ein bezahltes Abo folgt in Kürze — bis dahin danke fürs Ausprobieren!", en: "Your 14-day free trial has ended. A paid subscription is coming soon — thanks for trying it out in the meantime!" },
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("de");

  useEffect(() => {
    setLangState(detectInitialLang());
  }, []);

  function setLang(next) {
    setLangState(next);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  }

  const t = useMemo(() => {
    return (path, vars) => {
      const entry = resolvePath(TRANSLATIONS, path);
      if (entry == null) return path;
      const str = typeof entry === "object" ? entry[lang] ?? entry.de ?? path : entry;
      return interpolate(str, vars);
    };
  }, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
