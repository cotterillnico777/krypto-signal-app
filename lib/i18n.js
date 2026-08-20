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
    privacyLink: { de: "Datenschutz", en: "Privacy" },
    imprintLink: { de: "Impressum", en: "Imprint" },
    termsLink: { de: "Nutzungsbedingungen", en: "Terms of use" },
    riskLink: { de: "Risikohinweis", en: "Risk disclosure" },
    showPassword: { de: "Anzeigen", en: "Show" },
    hidePassword: { de: "Verbergen", en: "Hide" },
    appName: { de: "Finlyra", en: "Finlyra" },
    tagline: { de: "Finlyra – Finanzen verstehen. Besser investieren. Märkte analysieren.", en: "Finlyra – Understand finance. Invest better. Analyze markets." },
    positioningNote: {
      de: "Finlyra hilft dir, Märkte zu verstehen und einzuordnen -- keine automatisierte Anlageberatung, keine garantierten Kauf-/Verkaufsempfehlungen.",
      en: "Finlyra helps you understand and make sense of markets -- not automated investment advice, no guaranteed buy/sell recommendations.",
    },
  },
  login: {
    errorGeneric: { de: "Anmeldung fehlgeschlagen.", en: "Login failed." },
    errorEmailRequired: { de: "Bitte E-Mail-Adresse eingeben.", en: "Please enter your email address." },
    errorMagicFailed: { de: "Magic Link konnte nicht gesendet werden.", en: "Could not send magic link." },
    errorGoogleFailed: { de: "Google-Anmeldung fehlgeschlagen.", en: "Google sign-in failed." },
    title: { de: "Anmelden", en: "Log in" },
    magicSent: { de: "Der Anmeldelink wurde an {{email}} versendet. Er ist nur kurze Zeit gültig -- bitte E-Mail-Postfach (auch Spam-Ordner) zeitnah prüfen.", en: "The login link has been sent to {{email}}. It is only valid for a short time -- please check your inbox (including spam) soon." },
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
    passwordRequirement: { de: "Mindestens 6 Zeichen", en: "At least 6 characters" },
    passwordTooShort: { de: "Passwort muss mindestens 6 Zeichen lang sein.", en: "Password must be at least 6 characters long." },
    afterTrial: {
      de: "Was passiert nach den 14 Tagen? Dein Zugang pausiert automatisch, bis ein bezahltes Abo verfügbar ist -- es gibt keine automatische Abbuchung, da beim Signup keine Zahlungsdaten erfasst werden.",
      en: "What happens after 14 days? Your access pauses automatically until a paid plan is available -- there's no automatic charge, since no payment details are collected at signup.",
    },
    legalIntro: { de: "Rechtliches:", en: "Legal:" },
  },
  trackrecord: {
    metaDescriptionWithData: { de: "Portfolio-Backtest: {{returnPct}} (Buy&Hold: {{buyHoldPct}}), Max Drawdown {{maxDrawdown}}% -- echte Zahlen, nichts geschönt.", en: "Portfolio backtest: {{returnPct}} (buy & hold: {{buyHoldPct}}), max drawdown {{maxDrawdown}}% -- real numbers, nothing embellished." },
    metaDescriptionNoData: { de: "Echte, laufend aktualisierte Backtest-Ergebnisse der Finlyra-Standardstrategie.", en: "Real, continuously updated backtest results of Finlyra's default strategy." },
    pageTitle: { de: "Live-Track-Record -- Finlyra", en: "Live Track Record -- Finlyra" },
    h1: { de: "Live-Track-Record", en: "Live Track Record" },
    subtitle: { de: "Echte, laufend aktualisierte Backtest-Ergebnisse der Standard-Strategie — inklusive der schlechten Zahlen.", en: "Real, continuously updated backtest results of the default strategy — including the bad numbers." },
    computing: { de: "Der erste Snapshot wird gerade berechnet -- bitte in Kürze erneut vorbeischauen.", en: "The first snapshot is being computed right now -- please check back shortly." },
    pastPerformanceNote: {
      de: "Historischer Backtest, keine Garantie für zukünftige Ergebnisse -- vergangene Wertentwicklung sagt nichts Sicheres über die Zukunft aus.",
      en: "Historical backtest, no guarantee of future results -- past performance says nothing certain about the future.",
    },
    oosExplainerPre: { de: "\"Out-of-Sample\" bedeutet: getestet auf Daten, die die Strategie beim Optimieren nie gesehen hat -- der ehrlichste verfügbare Test. ", en: "\"Out-of-sample\" means: tested on data the strategy never saw while optimizing -- the most honest test available. " },
    oosExplainerLink: { de: "Mehr dazu im Glossar →", en: "More on this in the glossary →" },
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
    intro: { de: "Bevor ein neuer Faktor (ein Indikator, eine Makro-Kennzahl, eine Gewichtung) die Kaufen/Verkaufen-Entscheidung im Dashboard beeinflusst, testen wir ihn per Multi-Coin Walk-Forward-Validierung: die Strategie wird über mehrere unabhängige Zeitfenster (in der Regel 365, 730 und 850 Tage, über alle {{coinCount}} gehandelten Coins -- {{coins}}) auf Daten getestet, die sie beim Training nie gesehen hat. Nur wenn sich ein robuster Vorteil über mehrere Fenster hinweg zeigt, wird ein Faktor standardmäßig aktiviert.", en: "Before a new factor (an indicator, a macro metric, a weighting) can influence the buy/sell decision in the dashboard, we test it via multi-coin walk-forward validation: the strategy is tested over several independent time windows (typically 365, 730, and 850 days, across all {{coinCount}} traded coins -- {{coins}}) on data it never saw during training. Only if a robust advantage shows up across multiple windows does a factor get enabled by default." },
    introNotePre: { de: "Die Liste unten zeigt alle bisher getesteten Faktoren — auch die, die nicht geholfen oder sogar geschadet haben. Kein Cherry-Picking.", en: "The list below shows every factor tested so far — including the ones that didn't help or even hurt. No cherry-picking." },
    introGlossaryPre: { de: "Fachbegriffe unbekannt? ", en: "Unfamiliar terms? " },
    introGlossaryLink: { de: "Glossar mit allen Begriffen →", en: "Glossary with all terms →" },
    hypothesisLabel: { de: "Hypothese:", en: "Hypothesis:" },
    methodLabel: { de: "Methode:", en: "Method:" },
    resultLabel: { de: "Ergebnis:", en: "Result:" },
    tryYourself: { de: "Selbst ausprobieren?", en: "Want to try it yourself?" },
    summary: {
      de: "{{active}} von {{total}} getesteten Ideen sind aktiv, {{optional}} optional verfügbar, {{rejected}} verworfen.",
      en: "{{active}} of {{total}} tested ideas are active, {{optional}} available as opt-in, {{rejected}} rejected.",
    },
    whatItMeansTitle: { de: "Was bedeutet das für dich?", en: "What does this mean for you?" },
    whatItMeansBody: {
      de: "Nur die als \"Aktiv\" markierten Faktoren beeinflussen die Kaufen/Verkaufen-Einschätzung im Dashboard. Alles andere ist rein informativ -- entweder noch nicht robust genug bestätigt, oder nachweislich unwirksam bzw. schädlich, aber trotzdem hier dokumentiert statt versteckt.",
      en: "Only factors marked \"active\" influence the buy/sell assessment in the dashboard. Everything else is purely informational -- either not yet robustly confirmed, or demonstrably ineffective or harmful, but documented here anyway instead of hidden.",
    },
    filterAll: { de: "Alle", en: "All" },
    filterActive: { de: "Aktiv", en: "Active" },
    filterOptional: { de: "Optional", en: "Optional" },
    filterRejected: { de: "Verworfen", en: "Rejected" },
    detailsShow: { de: "Details anzeigen ▾", en: "Show details ▾" },
    detailsHide: { de: "Details ausblenden ▴", en: "Hide details ▴" },
    relatedTerms: { de: "Begriffe: ", en: "Terms: " },
  },
  legal: {
    placeholderBody: {
      de: "Diese Seite wird in Kürze mit den vollständigen Angaben ergänzt.",
      en: "This page will be filled in with the complete details shortly.",
    },
    backHome: { de: "← Zurück zur Startseite", en: "← Back to home" },
    privacyTitle: { de: "Datenschutz", en: "Privacy" },
    imprintTitle: { de: "Impressum", en: "Imprint" },
    termsTitle: { de: "Nutzungsbedingungen", en: "Terms of use" },
    riskTitle: { de: "Risikohinweis", en: "Risk disclosure" },
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
  nav: {
    dashboard: { de: "Dashboard", en: "Dashboard" },
    analyse: { de: "Analyse", en: "Analysis" },
    backtest: { de: "Backtest", en: "Backtest" },
    optimize: { de: "Optimierung", en: "Optimization" },
    walkforward: { de: "Walk-Forward", en: "Walk-Forward" },
    portfolio: { de: "Portfolio", en: "Portfolio" },
    chartAnalysis: { de: "Chart-Analyse", en: "Chart Analysis" },
    journal: { de: "Journal", en: "Journal" },
    holdings: { de: "Mein Portfolio", en: "My Holdings" },
    trades: { de: "Trades", en: "Trades" },
    riskReward: { de: "R:R-Rechner", en: "R:R Calculator" },
    alerts: { de: "Preis-Alarme", en: "Price Alerts" },
    info: { de: "Info", en: "Info" },
    trackRecord: { de: "Track-Record", en: "Track Record" },
    validation: { de: "Validierung", en: "Validation" },
    glossar: { de: "Glossar", en: "Glossary" },
    back: { de: "← Zurück", en: "← Back" },
  },
  trialBanner: {
    remainingOne: { de: "{{days}} Tag in der Testphase übrig", en: "{{days}} day left in your trial" },
    remainingMany: { de: "{{days}} Tage in der Testphase übrig", en: "{{days}} days left in your trial" },
    today: { de: "Testphase läuft heute ab", en: "Your trial ends today" },
    details: { de: "Details", en: "Details" },
  },
  onboarding: {
    progress: { de: "{{current}} / {{total}}", en: "{{current}} / {{total}}" },
    step0Title: { de: "Was möchtest du mit Finlyra erreichen?", en: "What do you want to achieve with Finlyra?" },
    step0Skip: { de: "Später entscheiden", en: "Decide later" },
    goalLearnMoney: { de: "Ich möchte den Umgang mit Geld lernen.", en: "I want to learn how to handle money." },
    goalStartInvesting: { de: "Ich möchte mit dem Investieren anfangen.", en: "I want to start investing." },
    goalUnderstandEtfs: { de: "Ich möchte ETFs verstehen.", en: "I want to understand ETFs." },
    goalUnderstandCrypto: { de: "Ich möchte Krypto und Märkte verstehen.", en: "I want to understand crypto and markets." },
    goalLearnTrading: { de: "Ich möchte Trading lernen.", en: "I want to learn trading." },
    goalStructureTrading: { de: "Ich trade bereits und möchte meine Entscheidungen strukturieren.", en: "I already trade and want to structure my decisions." },
    step1Title: { de: "Willkommen bei Finlyra 👋", en: "Welcome to Finlyra 👋" },
    step1Body: {
      de: "Diese App kombiniert technische Indikatoren, das gesamtwirtschaftliche Umfeld und Markt-Sentiment zu einer Kaufen/Verkaufen/Halten-Einschätzung pro Coin -- kurz erklärt statt als Blackbox.",
      en: "This app combines technical indicators, the macroeconomic environment, and market sentiment into a buy/sell/hold assessment per coin -- briefly explained instead of a black box.",
    },
    step2Title: { de: "Jedes Signal wird erklärt", en: "Every signal is explained" },
    step2Body: {
      de: "Unter jedem Badge steht ein Satz, WARUM die App gerade diese Einschätzung zeigt. Fachbegriffe wie RSI oder MACD haben zusätzlich ein ⓘ-Symbol mit einer kurzen Erklärung -- einfach mit der Maus draufhalten.",
      en: "Under every badge is a sentence explaining WHY the app shows this particular assessment right now. Technical terms like RSI or MACD also have an ⓘ symbol with a short explanation -- just hover over it.",
    },
    step3Title: { de: "Nichts wird einfach behauptet", en: "Nothing is just asserted" },
    step3BodyPre: {
      de: "Jeder Faktor, der in die Signale einfließt, wurde vorher empirisch getestet -- auch die Fälle, in denen etwas NICHT geholfen hat, werden gezeigt. Alles nachvollziehbar auf der ",
      en: "Every factor that feeds into the signals was empirically tested beforehand -- including the cases where something did NOT help. It's all traceable on the ",
    },
    step3BodyLink: { de: "Validierungs-Historie", en: "validation history" },
    step3BodyPost: { de: "-Seite.", en: " page." },
    step4Title: { de: "Ein Werkzeug, kein Anlageberater", en: "A tool, not a financial advisor" },
    step4Body: {
      de: "Die App ersetzt keine eigene Recherche und ist keine Anlageberatung. Der Backtest lässt dich Strategien selbst prüfen, bevor du dich auf ein Signal verlässt.",
      en: "This app doesn't replace your own research and is not investment advice. The backtest lets you verify strategies yourself before relying on a signal.",
    },
    skip: { de: "Überspringen", en: "Skip" },
    back: { de: "Zurück", en: "Back" },
    next: { de: "Weiter", en: "Next" },
    finish: { de: "Los geht's", en: "Let's go" },
  },
  dashboard: {
    title: { de: "Finlyra", en: "Finlyra" },
    subtitle: { de: "Krypto-Signale mit Makro-Kontext und KI-Analyse", en: "Crypto signals with macro context and AI analysis" },
    refresh: { de: "Aktualisieren", en: "Refresh" },
    beginnerModeTooltip: {
      de: "Vereinfachte Ansicht: zeigt nur Preis, Einschätzung und die Warum-Erklärung, technische Details ausklappbar statt immer sichtbar",
      en: "Simplified view: shows only price, assessment, and the why-explanation, technical details expandable instead of always visible",
    },
    beginnerMode: { de: "🎓 Einsteiger-Modus", en: "🎓 Beginner mode" },
    beginnerModeOn: { de: " an", en: " on" },
    errorAnalysis: { de: "Fehler beim Laden der KI-Analyse.", en: "Error loading AI analysis." },
    errorPrefix: { de: "Fehler: ", en: "Error: " },
    retry: { de: "Erneut versuchen", en: "Try again" },
    loadingData: { de: "Lade aktuelle Daten…", en: "Loading current data…" },
    m2Label: { de: "M2-Geldmenge (YoY)", en: "M2 money supply (YoY)" },
    rateLabel: { de: "Leitzins (aktuell)", en: "Interest rate (current)" },
    fgLabel: { de: "Fear & Greed Index", en: "Fear & Greed Index" },
    dxyLabel: { de: "Dollar-Index (3M-Trend)", en: "Dollar index (3M trend)" },
    yieldLabel: { de: "10J-Rendite (3M-Trend)", en: "10Y yield (3M trend)" },
    vixLabel: { de: "VIX (aktuell)", en: "VIX (current)" },
    nasdaqLabel: { de: "Nasdaq (90T-Trend)", en: "Nasdaq (90D trend)" },
    nasdaqTooltip: {
      de: "Fließt nicht ins Makro-Regime ein -- Multi-Coin Walk-Forward (16.08.2026, 365/730/850 Tage) bestätigte erneut keinen robusten Vorteil, im 850-Tage-Fenster sogar schädlich (-5,9% ggü. Baseline). Details: /validation",
      en: "Not part of the macro regime -- multi-coin walk-forward (16 Aug 2026, 365/730/850 days) again confirmed no robust advantage, even harmful in the 850-day window (-5.9% vs. baseline). Details: /validation",
    },
    sp500Label: { de: "S&P 500 (3M-Trend)", en: "S&P 500 (3M trend)" },
    sp500Tooltip: {
      de: "Fließt nicht ins Makro-Regime ein -- Multi-Coin Walk-Forward (16.08.2026, 365/730/850 Tage) zeigte im wichtigsten 850-Tage-Fenster einen klar schädlichen Effekt (-8,8% ggü. Baseline). Details: /validation",
      en: "Not part of the macro regime -- multi-coin walk-forward (16 Aug 2026, 365/730/850 days) showed a clearly harmful effect in the most important 850-day window (-8.8% vs. baseline). Details: /validation",
    },
    macroRegimeLabel: { de: "Makro-Regime: ", en: "Macro regime: " },
    macroRegimeHint: { de: "M2 · Zins-Trend · Dollar · 10J-Rendite · VIX", en: "M2 · rate trend · dollar · 10Y yield · VIX" },
    newsTitle: { de: "📰 Markt-News", en: "📰 Market News" },
    tipTooltip: {
      de: "Aus dem Backtest ermittelt (Multi-Fold Walk-Forward, 730+850 Tage): {{evidence}} Keine Anlageberatung -- historische Auswertung, keine Garantie für die Zukunft.",
      en: "Determined from the backtest (multi-fold walk-forward, 730+850 days): {{evidence}} Not investment advice -- historical analysis, no guarantee for the future.",
    },
    tipBadge: { de: "💡 Tipp", en: "💡 Tip" },
    rsiLabel: { de: "RSI ⓘ", en: "RSI ⓘ" },
    rsiTooltip: {
      de: "Relative Strength Index: misst, ob eine Coin gerade überkauft ist (über 70, evtl. bald fallend) oder überverkauft (unter 30, evtl. bald steigend).",
      en: "Relative Strength Index: measures whether a coin is currently overbought (above 70, possibly about to fall) or oversold (below 30, possibly about to rise).",
    },
    macdLabel: { de: "MACD ⓘ", en: "MACD ⓘ" },
    macdTooltip: {
      de: "Moving Average Convergence/Divergence: vergleicht zwei gleitende Durchschnitte, um einen Wechsel im Kurs-Momentum früh zu erkennen.",
      en: "Moving Average Convergence/Divergence: compares two moving averages to detect a shift in price momentum early.",
    },
    smaLabel: { de: "SMA ⓘ", en: "SMA ⓘ" },
    smaTooltip: {
      de: "Gleitender Durchschnitt (Simple Moving Average): zeigt, ob der aktuelle Kurstrend über oder unter seinem längerfristigen Durchschnitt liegt.",
      en: "Simple Moving Average: shows whether the current price trend is above or below its longer-term average.",
    },
    volumeLabel: { de: "Volumen ⓘ", en: "Volume ⓘ" },
    volumeTooltip: {
      de: "Heutiges Handelsvolumen im Vergleich zum Schnitt der letzten Tage -- ungewöhnlich hohes Volumen bestätigt eine Kursbewegung stärker.",
      en: "Today's trading volume compared to the average of recent days -- unusually high volume confirms a price move more strongly.",
    },
    whaleLabel: { de: "🐋 Whale ⓘ", en: "🐋 Whale ⓘ" },
    whaleTooltip: {
      de: "Positionierung der 'Top-Trader' (größte Positionen) auf Binance Futures im Vergleich zu ihrem eigenen 7-Tage-Schnitt -- ein Näherungswert für 'was machen die Großen gerade'.",
      en: "Positioning of the 'top traders' (largest positions) on Binance Futures compared to their own 7-day average -- an approximation of 'what are the big players doing right now'.",
    },
    liquidityLabel: { de: "💧 Liquidität", en: "💧 Liquidity" },
    liquidityTooltip: {
      de: "Fließt nicht ins Kaufen/Verkaufen-Signal ein -- reiner Marktkontext, keine Historie verfügbar (nur Live-Momentaufnahme)",
      en: "Not part of the buy/sell signal -- pure market context, no history available (live snapshot only)",
    },
    liquidityDepth: { de: "{{value}}k Tiefe (±1%)", en: "{{value}}k depth (±1%)" },
    bollingerLabel: { de: "Bollinger", en: "Bollinger" },
    stochRsiLabel: { de: "StochRSI", en: "StochRSI" },
    obvLabel: { de: "OBV", en: "OBV" },
    strongCandleLabel: { de: "Starke Kerze", en: "Strong candle" },
    marubozuLabel: { de: "Marubozu", en: "Marubozu" },
    secondaryTooltipValidated: {
      de: "Fließt nicht ins Kaufen/Verkaufen-Signal ein (siehe Walk-Forward-Vergleich)",
      en: "Not part of the buy/sell signal (see walk-forward comparison)",
    },
    secondaryTooltipUnvalidated: {
      de: "Fließt nicht ins Kaufen/Verkaufen-Signal ein (noch nicht validiert)",
      en: "Not part of the buy/sell signal (not yet validated)",
    },
    lessDetails: { de: "Weniger Details ▴", en: "Less detail ▴" },
    showDetails: { de: "Details anzeigen ▾", en: "Show detail ▾" },
    moreIndicators: { de: "Weitere Indikatoren ▾", en: "More indicators ▾" },
    aiAnalyzing: { de: "KI analysiert…", en: "AI analyzing…" },
    aiButton: { de: "🤖 KI-Analyse", en: "🤖 AI analysis" },
    priceHistory: { de: "{{name}} — Kursverlauf ({{tf}})", en: "{{name}} — price history ({{tf}})" },
    cycleTitle: { de: "🔄 Zyklus-Analyse — {{name}}", en: "🔄 Cycle analysis — {{name}}" },
    cycleLoading: { de: "Lade Zyklus-Daten…", en: "Loading cycle data…" },
    cycleNotEnoughHistory: { de: "Nicht genug Kurshistorie für einen Zyklusvergleich bei diesem Coin.", en: "Not enough price history for a cycle comparison for this coin." },
    cyclePreviousAth: { de: "Vorheriges Zyklus-ATH: ", en: "Previous cycle ATH: " },
    cycleNoPrevious: { de: "Kein abgeschlossener vorheriger Zyklus in der verfügbaren Historie.", en: "No completed previous cycle in the available history." },
    cyclePreviousBottom: { de: "Vorheriges Zyklus-Tief: ", en: "Previous cycle bottom: " },
    cycleCurrentAth: { de: "Aktuelles Zyklus-ATH: ", en: "Current cycle ATH: " },
    cycleDaysUnit: { de: "nach {{n}} Tagen", en: "after {{n}} days" },
    cycleDayN: { de: "Tag {{n}} seit ATH", en: "day {{n}} since ATH" },
    cycleTimeComparisonText: {
      de: "Zeitvergleich: Im vorherigen Zyklus dauerte es {{daysPrev}} Tage vom ATH bis zum Tief. Aktuell sind seit dem ATH {{daysSince}} Tage vergangen ({{pct}}% dieser vorherigen Dauer).",
      en: "Time comparison: in the previous cycle, it took {{daysPrev}} days from ATH to bottom. Currently, {{daysSince}} days have passed since the ATH ({{pct}}% of that previous duration).",
    },
    cycleBottomFormation: { de: "Bodenbildung: ", en: "Bottom formation: " },
    cycleBottomNotApplicable: { de: "Nicht anwendbar (kein signifikanter Drawdown vom aktuellen Zyklus-ATH)", en: "Not applicable (no significant drawdown from the current cycle ATH)" },
    cycleBottomScore0: { de: "Keine Anzeichen erkennbar", en: "No signs visible" },
    cycleBottomScore1: { de: "Erste, schwache Anzeichen", en: "First, weak signs" },
    cycleBottomScore2: { de: "Mehrere Anzeichen", en: "Multiple signs" },
    cycleBottomScore3: { de: "Deutliche, mehrfach bestätigte Anzeichen", en: "Clear, multiply-confirmed signs" },
    cycleTrendRegime: { de: "Trendregime (wöchentlich): ", en: "Trend regime (weekly): " },
    disclaimer: {
      de: "Keine Anlageberatung. Kryptowährungen sind hoch volatil – Investitionen können zum Totalverlust führen.",
      en: "Not investment advice. Cryptocurrencies are highly volatile -- investments can result in a total loss.",
    },
    tf4h: { de: "4 Stunden", en: "4 hours" },
    tf1d: { de: "Täglich", en: "Daily" },
    tf1w: { de: "Wöchentlich", en: "Weekly" },
  },
  tools: {
    // Gemeinsame Bausteine für backtest.js/optimize.js/walkforward.js/
    // portfolio.js -- die vier Seiten teilen sich stark überlappende
    // Toolbar-/Tabellen-/Ergebnis-Muster (PERIODS/COSTS/STOP_LOSSES/
    // LEVERAGES-Arrays, Handelskosten/Richtung/Hebel-Regler,
    // Rendite/Sharpe/Drawdown-Kennzahlen).
    shared: {
      p90: { de: "90 Tage", en: "90 days" },
      p365: { de: "1 Jahr", en: "1 year" },
      p730: { de: "2 Jahre", en: "2 years" },
      p1460: { de: "4 Jahre", en: "4 years" },
      p2920: { de: "8 Jahre", en: "8 years" },
      cost0: { de: "0% (unrealistisch)", en: "0% (unrealistic)" },
      cost15: { de: "0,15% (Standard)", en: "0.15% (default)" },
      cost30: { de: "0,3% (konservativ)", en: "0.3% (conservative)" },
      stopLossNone: { de: "Kein Stop", en: "No stop" },
      leverageNone: { de: "1x (kein Hebel)", en: "1x (no leverage)" },
      trendfilterNone: { de: "Kein Filter", en: "No filter" },
      stopLossLabel: { de: "Stop-Loss", en: "Stop-loss" },
      trendfilterLabel: { de: "Trendfilter (ADX)", en: "Trend filter (ADX)" },
      direction: { de: "Richtung", en: "Direction" },
      longOnly: { de: "Nur Long", en: "Long only" },
      longShort: { de: "Long + Short", en: "Long + short" },
      leverage: { de: "Hebel", en: "Leverage" },
      costsLabel: { de: "Handelskosten", en: "Trading costs" },
      period: { de: "Zeitraum", en: "Period" },
      mode: { de: "Modus", en: "Mode" },
      oneCoin: { de: "1 Coin", en: "1 coin" },
      allCoins: { de: "Alle {{count}} Coins", en: "All {{count}} coins" },
      errorPrefix: { de: "Fehler: ", en: "Error: " },
      strategyReturn: { de: "Strategie-Rendite", en: "Strategy return" },
      finalCapital: { de: "Endkapital: ${{final}} (Start: ${{start}})", en: "Final capital: ${{final}} (start: ${{start}})" },
      buyHoldReturn: { de: "Buy & Hold Rendite", en: "Buy & hold return" },
      buyHoldNote: { de: "Einfach kaufen & halten, zum Vergleich", en: "Simply buy & hold, for comparison" },
      maxDrawdown: { de: "Max Drawdown", en: "Max drawdown" },
      maxDrawdownNote: { de: "Größter Rückgang vom Höchststand", en: "Largest decline from peak" },
      tradeCount: { de: "Anzahl Trades", en: "Number of trades" },
      liquidatedNote: { de: "davon {{count}} liquidiert", en: "of which {{count}} liquidated" },
      winRate: { de: "Trefferquote", en: "Win rate" },
      sharpeSortino: { de: "Sharpe / Sortino", en: "Sharpe / Sortino" },
      sharpeSortinoNote: { de: "Rendite pro Risikoeinheit (annualisiert)", en: "Return per unit of risk (annualized)" },
      equityCurve: { de: "Equity-Kurve", en: "Equity curve" },
      tradesHeading: { de: "Trades ({{count}})", en: "Trades ({{count}})" },
      noTrades: { de: "Keine Kaufsignale im gewählten Zeitraum ausgelöst.", en: "No buy signals triggered in the selected period." },
      thDirection: { de: "Richtung", en: "Direction" },
      thEntry: { de: "Einstieg", en: "Entry" },
      thEntryPrice: { de: "Einstiegs-Preis", en: "Entry price" },
      thExit: { de: "Ausstieg", en: "Exit" },
      thExitPrice: { de: "Ausstiegs-Preis", en: "Exit price" },
      thReturn: { de: "Rendite", en: "Return" },
      short: { de: "Short", en: "Short" },
      long: { de: "Long", en: "Long" },
      openSuffix: { de: " (offen)", en: " (open)" },
      stopSuffix: { de: " (Stop)", en: " (stop)" },
      liquidatedSuffix: { de: " (liquidiert)", en: " (liquidated)" },
      targetSuffix: { de: " (Target)", en: " (target)" },
      simulating: { de: "Simuliere…", en: "Simulating…" },
      adxOff: { de: "aus", en: "off" },
      noStopShort: { de: "kein Stop", en: "no stop" },
      noFilterShort: { de: "kein Filter", en: "no filter" },
      shortAllowed: { de: " · Short erlaubt", en: " · short allowed" },
      costsPerSide: { de: "% Kosten/Seite", en: "% costs/side" },
      tipForCoin: { de: "💡 Tipp für {{symbol}} (aus Multi-Fold Walk-Forward, 730+850 Tage)", en: "💡 Tip for {{symbol}} (from multi-fold walk-forward, 730+850 days)" },
      applyTip: { de: "Tipp übernehmen", en: "Apply tip" },
      paramsLabel: { de: "SMA {{smaFast}}/{{smaSlow}} · RSI {{rsiBuy}}/{{rsiSell}} · ADX {{adx}}", en: "SMA {{smaFast}}/{{smaSlow}} · RSI {{rsiBuy}}/{{rsiSell}} · ADX {{adx}}" },
      weakInTest: { de: "schwach im Test", en: "weak in test" },
      lowSample: { de: "geringe Stichprobe", en: "low sample size" },
      trainReturn: { de: "Train Rendite", en: "Train return" },
      trainSharpe: { de: "Train Sharpe", en: "Train Sharpe" },
      testReturn: { de: "Test Rendite", en: "Test return" },
      testSharpe: { de: "Test Sharpe", en: "Test Sharpe" },
      testTrades: { de: "Test Trades", en: "Test trades" },
      trainAvgReturn: { de: "Train Ø-Rendite", en: "Train avg. return" },
      trainAvgSharpe: { de: "Train Ø-Sharpe", en: "Train avg. Sharpe" },
      trainConsistency: { de: "Train Konsistenz", en: "Train consistency" },
      testAvgReturn: { de: "Test Ø-Rendite", en: "Test avg. return" },
      testAvgSharpe: { de: "Test Ø-Sharpe", en: "Test avg. Sharpe" },
      testConsistency: { de: "Test Konsistenz", en: "Test consistency" },
      positiveOf: { de: "{{positive}}/{{total}} positiv", en: "{{positive}}/{{total}} positive" },
      hashParam: { de: "#", en: "#" },
      parameter: { de: "Parameter", en: "Parameters" },
    },
    backtest: {
      title: { de: "Backtest", en: "Backtest" },
      subtitle: { de: "Wie hätte die Signal-Strategie historisch performt?", en: "How would the signal strategy have performed historically?" },
      trendfilterTooltip: {
        de: "Schwächt Kaufen/Verkaufen-Crossover-Signale zu Halten ab, wenn der Trend laut ADX zu schwach ist. Gemischte Ergebnisse je Coin (siehe Tooltip auf den Reglern) -- kein Standardverhalten, gezielt zum Ausprobieren.",
        en: "Weakens buy/sell crossover signals to hold when the trend is too weak according to ADX. Mixed results per coin (see tooltip on the controls) -- not default behavior, meant for targeted experimentation.",
      },
      liquidationWarning: {
        de: "⚠️ Bei Hebel {{leverage}}x wird die Position liquidiert (Totalverlust der Margin), wenn sich der Kurs um {{pct}}% gegen dich bewegt. Funding-Kosten (echte historische Binance-Perpetual-Rates) fließen mit ein.",
        en: "⚠️ At {{leverage}}x leverage, the position gets liquidated (total loss of margin) if the price moves {{pct}}% against you. Funding costs (real historical Binance perpetual rates) are factored in.",
      },
      start: { de: "▶ Backtest starten", en: "▶ Start backtest" },
      metaLabel: { de: "Coin / Zeitraum / Stop / Trendfilter / Hebel / Kosten", en: "Coin / period / stop / trend filter / leverage / costs" },
      disclaimer: {
        de: 'Historische Simulation der Dashboard-Signale (SMA + RSI + MACD + Volumen + Makro + Fear & Greed), Start-Kapital $10.000. Handelskosten (Fee + Slippage) werden standardmäßig mit 0,15% je Seite einkalkuliert, auch beim Buy&Hold-Vergleich – "0%" zeigt die unrealistische Kosten-freie Variante zum Vergleich. Bei Hebel >1x oder Short-Positionen werden echte historische Funding-Rates von Binance-Perpetuals einbezogen und eine Liquidierungsschwelle simuliert – trotzdem eine vereinfachte Annahme, echter Hebelhandel ist riskanter als hier abgebildet. Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.',
        en: 'Historical simulation of the dashboard signals (SMA + RSI + MACD + volume + macro + Fear & Greed), starting capital $10,000. Trading costs (fee + slippage) are factored in at 0.15% per side by default, including in the buy & hold comparison -- "0%" shows the unrealistic cost-free variant for comparison. At >1x leverage or short positions, real historical funding rates from Binance perpetuals are included and a liquidation threshold is simulated -- still a simplified assumption, real leveraged trading is riskier than depicted here. Past performance is no guarantee of future results. Not investment advice.',
      },
    },
    optimize: {
      title: { de: "Parameter-Optimierung", en: "Parameter Optimization" },
      subtitle: { de: "SMA/RSI/ADX-Raster mit Out-of-Sample-Check gegen Overfitting", en: "SMA/RSI/ADX grid with out-of-sample check against overfitting" },
      bannerMulti: {
        de: "🔬 Testet 80 Kombinationen über alle {{count}} Coins gleichzeitig und rankt nach durchschnittlichem Sharpe – eine Kombination, die nur bei einem Coin gut aussieht, fällt im Schnitt durch. Dauert länger (~30-60s).",
        en: "🔬 Tests 80 combinations across all {{count}} coins simultaneously and ranks by average Sharpe -- a combination that only looks good for one coin falls through on average. Takes longer (~30-60s).",
      },
      bannerSingle: {
        de: "🔬 Testet automatisch 80 Kombinationen (5 SMA-Paare × 4 RSI-Schwellen × 4 ADX-Filter) auf den ersten 70% des Zeitraums (Training), prüft die Top 5 nach Sharpe Ratio dann auf den letzten 30% (Test) nach. Kann ~10-30s dauern.",
        en: "🔬 Automatically tests 80 combinations (5 SMA pairs × 4 RSI thresholds × 4 ADX filters) on the first 70% of the period (training), then checks the top 5 by Sharpe ratio on the last 30% (test). Can take ~10-30s.",
      },
      start: { de: "🔬 Optimierung starten", en: "🔬 Start optimization" },
      optimizing: { de: "Optimiere… (kann etwas dauern)", en: "Optimizing… (may take a moment)" },
      trainTestSplit: { de: "Trainings-/Test-Split", en: "Train/test split" },
      trainTestSplitValue: {
        de: "{{trainDays}} Tage Training · {{testDays}} Tage Test (ab {{splitDate}}) · {{count}} Kombinationen getestet",
        en: "{{trainDays}} days training · {{testDays}} days test (from {{splitDate}}) · {{count}} combinations tested",
      },
      trainTestSplitMultiLabel: { de: "Trainings-/Test-Split · Coins", en: "Train/test split · coins" },
      trainTestSplitMultiValue: {
        de: "{{trainDays}} Tage Training · {{testDays}} Tage Test · {{count}} Kombinationen × {{coinCount}} Coins ({{coins}})",
        en: "{{trainDays}} days training · {{testDays}} days test · {{count}} combinations × {{coinCount}} coins ({{coins}})",
      },
      top5Single: { de: "Top 5 nach Trainings-Sharpe (mit Out-of-Sample-Vergleich)", en: "Top 5 by training Sharpe (with out-of-sample comparison)" },
      top5Multi: { de: "Top 5 nach durchschnittlichem Trainings-Sharpe (über alle Coins)", en: "Top 5 by average training Sharpe (across all coins)" },
      noteSingle: {
        de: "\"Schwach im Test\" heißt: die Kombination war im Training gut, hat sich auf ungesehenen Daten aber nicht bestätigt – typisches Overfitting-Warnsignal. Nur Kombinationen, die im Training und im Test solide abschneiden, würde ich als robust genug für den echten Backtest mit mehr Optionen (Stop-Loss/Short/Hebel) ansehen.",
        en: "\"Weak in test\" means: the combination was good in training but didn't hold up on unseen data -- a typical overfitting warning sign. I'd only consider combinations that perform solidly in both training and test robust enough for the real backtest with more options (stop-loss/short/leverage).",
      },
      testPerCoin: { de: "Test je Coin:", en: "Test per coin:" },
      noteMulti: {
        de: "\"Konsistenz\" zählt, bei wie vielen der {{count}} Coins die Kombination eine positive Rendite lieferte. Eine Kombination mit hohem Ø-Sharpe aber niedriger Konsistenz wird meist nur von einem einzelnen Ausreißer-Coin getragen – weniger überzeugend als eine, die über mehrere Coins hinweg konsistent funktioniert.",
        en: "\"Consistency\" counts how many of the {{count}} coins the combination produced a positive return for. A combination with a high average Sharpe but low consistency is usually carried by a single outlier coin -- less convincing than one that works consistently across multiple coins.",
      },
      disclaimer: {
        de: "Rastersuche über SMA-Perioden, RSI-Schwellen und ADX-Trendfilter mit Trainings-/Test-Split zur Overfitting-Kontrolle. Handelskosten (Fee + Slippage) fließen standardmäßig mit 0,15% je Seite ein, auch beim Buy&Hold-Vergleich. Auch robuste Ergebnisse sind keine Garantie für zukünftige Performance – Marktbedingungen ändern sich. Keine Anlageberatung.",
        en: "Grid search over SMA periods, RSI thresholds, and ADX trend filter with train/test split for overfitting control. Trading costs (fee + slippage) are factored in at 0.15% per side by default, including in the buy & hold comparison. Even robust results are no guarantee of future performance -- market conditions change. Not investment advice.",
      },
    },
    walkforward: {
      title: { de: "Walk-Forward-Validierung", en: "Walk-Forward Validation" },
      subtitle: { de: "Mehrere versetzte Trainings-/Test-Fenster statt nur einem", en: "Multiple staggered train/test windows instead of just one" },
      bannerBase: {
        de: "📈 Teilt den Zeitraum in 5 aufeinanderfolgende Segmente. Pro Fold wird auf allen Segmenten bis dahin (wachsendes Trainingsfenster) die beste Kombination aus 80 gesucht und direkt auf dem nächsten, ungesehenen Segment getestet – simuliert, wie ein regelmäßiges Neu-Optimieren in der Praxis abgeschnitten hätte.",
        en: "📈 Splits the period into 5 consecutive segments. Each fold searches for the best combination out of 80 across all segments up to that point (growing training window) and tests it directly on the next, unseen segment -- simulates how regularly re-optimizing would have performed in practice.",
      },
      bannerMultiSuffix: {
        de: " Im Multi-Coin-Modus wird die Kombination pro Fold über alle {{count}} Coins gleichzeitig gerankt (Ø-Sharpe) – kombiniert die beiden strengsten Overfitting-Checks.",
        en: " In multi-coin mode, the combination is ranked per fold across all {{count}} coins simultaneously (avg. Sharpe) -- combines the two strictest overfitting checks.",
      },
      start: { de: "📈 Walk-Forward starten", en: "📈 Start walk-forward" },
      validating: { de: "Validiere… (kann etwas dauern)", en: "Validating… (may take a moment)" },
      avgOosReturn: { de: "Ø Out-of-Sample-Rendite", en: "Avg. out-of-sample return" },
      avgOosReturnNoteSingle: { de: "Durchschnitt über alle {{count}} Test-Fenster", en: "Average across all {{count}} test windows" },
      avgOosReturnNoteMulti: { de: " (Ø über {{count}} Coins)", en: " (avg. across {{count}} coins)" },
      avgOosSharpe: { de: "Ø Out-of-Sample-Sharpe", en: "Avg. out-of-sample Sharpe" },
      avgOosSharpeNote: { de: "Risikoadjustiert, annualisiert", en: "Risk-adjusted, annualized" },
      profitableFolds: { de: "Profitable Folds", en: "Profitable folds" },
      profitableFoldsNoteMulti: { de: "Wie oft war die Ø-Rendite über alle Coins positiv?", en: "How often was the average return positive across all coins?" },
      profitableFoldsNoteSingle: { de: "Wie oft war das Test-Fenster positiv?", en: "How often was the test window positive?" },
      shortenedPeriod: {
        de: "Gemeinsamer Zeitraum verkürzt von {{requested}}T auf {{actual}}T, da mind. ein Coin (z.B. TAO) kürzer gelistet ist.",
        en: "Common period shortened from {{requested}}D to {{actual}}D since at least one coin (e.g. TAO) has been listed for a shorter time.",
      },
      foldsDetail: { de: "Folds im Detail", en: "Folds in detail" },
      foldsDetailMulti: { de: "Folds im Detail (über alle {{count}} Coins gerankt)", en: "Folds in detail (ranked across all {{count}} coins)" },
      thFold: { de: "Fold", en: "Fold" },
      thTrainDays: { de: "Training (Tage)", en: "Training (days)" },
      thTestPeriod: { de: "Test-Zeitraum", en: "Test period" },
      thChosenParams: { de: "Gewählte Parameter", en: "Chosen parameters" },
      foldTestPerCoin: { de: "Fold {{fold}} Test je Coin:", en: "Fold {{fold}} test per coin:" },
      noteSingle: {
        de: "Jeder Fold wählt unabhängig die im jeweiligen Trainingsfenster beste Kombination (nach Sharpe) und testet sie sofort auf dem nächsten Segment. Wechseln die gewählten Parameter stark von Fold zu Fold, ist das ein Hinweis, dass es keine stabile Kante gibt, sondern die \"beste\" Kombination stark vom Marktregime abhängt. Erst wenn die Ø Out-of-Sample-Werte über mehrere Folds hinweg konsistent positiv sind, würde ich das als robusteren Hinweis auf echten Vorteil werten als einen einzelnen Train/Test-Split.",
        en: "Each fold independently picks the best combination (by Sharpe) in its respective training window and immediately tests it on the next segment. If the chosen parameters change a lot from fold to fold, that suggests there's no stable edge, and the \"best\" combination depends heavily on the market regime. Only when the average out-of-sample values are consistently positive across multiple folds would I consider that a more robust indication of a real edge than a single train/test split.",
      },
      noteMulti: {
        de: "Kombiniert die beiden strengsten Overfitting-Checks: pro Fold wird die Parameter-Kombination über alle {{count}} Coins gleichzeitig gerankt (nicht nur eine, die zufällig zu einem einzelnen Coin passt), UND über 4 zeitlich versetzte Test-Fenster geprüft (nicht nur ein einzelner Split). \"Konsistenz\" zeigt, bei wie vielen Coins der Fold im Test positiv war – niedrige Konsistenz trotz positiver Ø-Rendite bedeutet, dass ein einzelner Ausreißer-Coin das Ergebnis trägt.",
        en: "Combines the two strictest overfitting checks: per fold, the parameter combination is ranked across all {{count}} coins simultaneously (not just one that happens to fit a single coin), AND checked over 4 staggered test windows (not just a single split). \"Consistency\" shows how many coins the fold was positive for in test -- low consistency despite a positive average return means a single outlier coin is carrying the result.",
      },
      disclaimer: {
        de: "Walk-Forward-Validierung mit 4 rollierenden Test-Fenstern (5 Segmente, wachsendes Trainingsfenster), SMA/RSI/ADX-Rastersuche pro Fold. Handelskosten (Fee + Slippage) fließen standardmäßig mit 0,15% je Seite ein. Auch konsistent positive Ergebnisse sind keine Garantie für zukünftige Performance. Keine Anlageberatung.",
        en: "Walk-forward validation with 4 rolling test windows (5 segments, growing training window), SMA/RSI/ADX grid search per fold. Trading costs (fee + slippage) are factored in at 0.15% per side by default. Even consistently positive results are no guarantee of future performance. Not investment advice.",
      },
    },
    portfolio: {
      title: { de: "Portfolio-Backtest", en: "Portfolio Backtest" },
      subtitle: { de: "Echte Kapitalaufteilung über alle {{count}} Coins gleichzeitig", en: "Real capital allocation across all {{count}} coins simultaneously" },
      legendPortfolio: { de: "Portfolio", en: "Portfolio" },
      legendBuyHold: { de: "Buy & Hold (alle {{count}}, gleichgewichtet)", en: "Buy & hold (all {{count}}, equal-weighted)" },
      banner: {
        de: "💼 Verteilt $10.000 gleichmäßig auf {{symbols}} (${{perCoin}} je Coin) und lässt jeden mit der Dashboard-Signal-Strategie unabhängig handeln – kein Rebalancing zwischen den Coins. Zeigt, ob die Streuung über mehrere Coins den Drawdown/Sharpe im Vergleich zu den Einzelcoins verbessert.",
        en: "💼 Distributes $10,000 evenly across {{symbols}} (${{perCoin}} per coin) and lets each trade independently using the dashboard signal strategy -- no rebalancing between coins. Shows whether spreading across multiple coins improves drawdown/Sharpe compared to the individual coins.",
      },
      start: { de: "▶ Portfolio-Backtest starten", en: "▶ Start portfolio backtest" },
      portfolioReturn: { de: "Portfolio-Rendite", en: "Portfolio return" },
      buyHoldNoteAll: { de: "Alle {{count}} Coins gleichgewichtet kaufen & halten", en: "Buy & hold all {{count}} coins, equal-weighted" },
      portfolioMaxDrawdown: { de: "Portfolio Max Drawdown", en: "Portfolio max drawdown" },
      avgCoinsDrawdown: { de: "Ø Einzelcoins: {{pct}}%", en: "Avg. individual coins: {{pct}}%" },
      diversificationHelps: { de: " · Diversifikation hilft", en: " · diversification helps" },
      tradeCountTotal: { de: "Anzahl Trades (gesamt)", en: "Number of trades (total)" },
      avgPerCoin: { de: "Ø {{avg}} je Coin", en: "avg. {{avg}} per coin" },
      portfolioSharpeSortino: { de: "Portfolio Sharpe / Sortino", en: "Portfolio Sharpe / Sortino" },
      avgCoinSharpe: { de: "Ø Einzelcoins Sharpe: {{value}}", en: "Avg. individual coins Sharpe: {{value}}" },
      periodLeverageCosts: { de: "Zeitraum / Hebel / Kosten", en: "Period / leverage / costs" },
      shortenedNote: { de: "Verkürzt von {{requested}}T, da mind. ein Coin (z.B. TAO) kürzer gelistet ist.", en: "Shortened from {{requested}}D since at least one coin (e.g. TAO) has been listed for a shorter time." },
      portfolioEquityCurve: { de: "Portfolio-Equity-Kurve", en: "Portfolio equity curve" },
      perCoinHeading: { de: "Pro Coin (je ${{cash}} Startkapital)", en: "Per coin (${{cash}} starting capital each)" },
      thCoin: { de: "Coin", en: "Coin" },
      thSortino: { de: "Sortino", en: "Sortino" },
      thTrades: { de: "Trades", en: "Trades" },
      diversificationNote: {
        de: "Diversifikationseffekt: Der Portfolio-Max-Drawdown ({{portfolioDd}}%) im Vergleich zum Durchschnitt der Einzelcoins ({{avgDd}}%) zeigt, ob unkorrelierte Bewegungen zwischen den Coins die Schwankungen im Vergleich zu einer Einzelcoin-Position abfedern. Da alle {{count}} Coins derselben Signal-Logik folgen und Krypto-Assets tendenziell stark korrelieren, ist der Effekt oft kleiner als bei klassischen Multi-Asset-Portfolios (Aktien/Anleihen/Rohstoffe) – aber selten null.",
        en: "Diversification effect: the portfolio max drawdown ({{portfolioDd}}%) compared to the average of the individual coins ({{avgDd}}%) shows whether uncorrelated movements between coins cushion volatility compared to a single-coin position. Since all {{count}} coins follow the same signal logic and crypto assets tend to be strongly correlated, the effect is often smaller than in classic multi-asset portfolios (stocks/bonds/commodities) -- but rarely zero.",
      },
      diversificationLowSample: {
        de: " Mit Ø {{avg}} Trades je Coin in diesem Lauf ist das Ergebnis allerdings eher eine Summe weniger dominanter Einzelwetten als ein statistisch belastbarer Beleg für echte Diversifikation – für ein verlässlicheres Bild einen längeren Zeitraum wählen oder mehrere Zeiträume vergleichen.",
        en: " With an average of {{avg}} trades per coin in this run, however, the result is more a sum of a few dominant individual bets than statistically solid evidence of real diversification -- choose a longer period or compare multiple periods for a more reliable picture.",
      },
      disclaimerPre: {
        de: "Portfolio-Backtest: $10.000 gleichmäßig auf {{symbols}} verteilt, jeder Coin handelt unabhängig nach der Dashboard-Signal-Strategie (SMA + RSI + MACD + Volumen + Makro + Fear & Greed), kein Rebalancing zwischen den Coins über die Zeit. Handelskosten (Fee + Slippage) mit 0,15% je Seite standardmäßig aktiv, auch beim Buy&Hold-Vergleich. Der gemeinsame Betrachtungszeitraum richtet sich nach dem am kürzesten gelisteten Coin.",
        en: "Portfolio backtest: $10,000 distributed evenly across {{symbols}}, each coin trades independently using the dashboard signal strategy (SMA + RSI + MACD + volume + macro + Fear & Greed), no rebalancing between coins over time. Trading costs (fee + slippage) active by default at 0.15% per side, including in the buy & hold comparison. The common observation period is determined by the coin listed for the shortest time.",
      },
      disclaimerLimitsLabel: {
        de: "Zwei Einschränkungen, die die Aussagekraft begrenzen:",
        en: "Two limitations that constrain the significance:",
      },
      disclaimerLimitsBody: {
        de: " Alle {{count}} Coins handeln mit denselben Standard-Parametern statt je Coin optimierten Werten (siehe \"🔬 Optimierung\"), und es ist ein einzelner statischer Lauf ohne Trainings-/Test-Split oder Walk-Forward-Check. Bei kurzen/mittleren Zeiträumen kann jeder Coin nur 1-2 Trades ausführen – dann ist das \"Portfolio\" im Kern eine Summe weniger dominanter Einzelwetten, keine statistisch robuste Stichprobe.",
        en: " All {{count}} coins trade with the same default parameters instead of per-coin optimized values (see \"🔬 Optimization\"), and it's a single static run without a train/test split or walk-forward check. At short/medium periods, each coin can only execute 1-2 trades -- then the \"portfolio\" is essentially a sum of a few dominant individual bets, not a statistically robust sample.",
      },
      disclaimerPost: {
        de: "Vergangene Wertentwicklung ist keine Garantie für zukünftige Ergebnisse. Keine Anlageberatung.",
        en: "Past performance is no guarantee of future results. Not investment advice.",
      },
    },
  },
  holdings: {
      title: { de: "Mein Portfolio", en: "My Holdings" },
      subtitle: { de: "Echte Bestände eintragen, reale Rendite sehen", en: "Enter real holdings, see real returns" },
      currentValue: { de: "Aktueller Wert", en: "Current value" },
      costBasisNote: { de: "Einstand: ${{cost}}", en: "Cost basis: ${{cost}}" },
      profitLoss: { de: "Gewinn/Verlust", en: "Profit/loss" },
      positions: { de: "Positionen", en: "Positions" },
      addHolding: { de: "Bestand hinzufügen", en: "Add holding" },
      coin: { de: "Coin", en: "Coin" },
      quantity: { de: "Menge", en: "Quantity" },
      costBasisLabel: { de: "Einstandspreis pro Einheit (USD)", en: "Cost basis per unit (USD)" },
      add: { de: "Hinzufügen", en: "Add" },
      manualNote: {
        de: "Manuelle Eingabe -- kein Exchange-Zugang, keine automatische Erkennung. Aktueller Kurs kommt live aus dem Dashboard-Datenfeed.",
        en: "Manual entry -- no exchange access, no automatic detection. Current price comes live from the dashboard data feed.",
      },
      holdingsHeading: { de: "Bestände", en: "Holdings" },
      loading: { de: "Lade…", en: "Loading…" },
      noHoldings: { de: "Noch keine Bestände eingetragen.", en: "No holdings entered yet." },
      unitsNote: { de: "{{qty}} Stück · Einstand ${{cost}}", en: "{{qty}} units · cost basis ${{cost}}" },
      deleteHolding: { de: "Bestand löschen", en: "Delete holding" },
      disclaimer: {
        de: "Rein manuelle Eingabe, keine Verbindung zu einer Exchange. Aktuelle Kurse verzögert/live vom selben Datenfeed wie das Dashboard. Keine Anlageberatung.",
        en: "Purely manual entry, no connection to an exchange. Current prices delayed/live from the same data feed as the dashboard. Not investment advice.",
      },
    },
    trades: {
      title: { de: "Trades", en: "Trades" },
      subtitle: { de: "Dein manuelles Trade-Journal und Trade-Tracking", en: "Your manual trade journal and trade tracking" },
      tradesLabel: { de: "Trades", en: "Trades" },
      openClosedNote: { de: "{{open}} offen, {{closed}} geschlossen", en: "{{open}} open, {{closed}} closed" },
      winRateAvgR: { de: "Trefferquote / Ø-R-Multiple", en: "Win rate / avg. R-multiple" },
      totalPnl: { de: "Gesamt-PnL", en: "Total PnL" },
      avgPnlNote: { de: "Ø-PnL pro Trade: {{value}}", en: "Avg. PnL per trade: {{value}}" },
      weekStreak: { de: "Wochen-Streak", en: "Week streak" },
      weekOne: { de: "Woche", en: "week" },
      weekMany: { de: "Wochen", en: "weeks" },
      streakNote: { de: "{{unit}} in Folge mit mind. 1 Trade", en: "consecutive {{unit}} with at least 1 trade" },
      streakRecord: { de: " (Rekord: {{record}})", en: " (record: {{record}})" },
      milestones: { de: "Meilensteine", en: "Milestones" },
      milestonesLastReached: { de: " -- zuletzt {{count}} Trades erreicht", en: " -- last reached {{count}} trades" },
      milestonesToGo: { de: "Noch {{remaining}} bis {{next}} Trades", en: "{{remaining}} to go until {{next}} trades" },
      milestonesAllReached: { de: "Alle Meilensteine erreicht 🏆", en: "All milestones reached 🏆" },
      newTrade: { de: "Neuer Trade", en: "New trade" },
      symbol: { de: "Symbol", en: "Symbol" },
      direction: { de: "Richtung", en: "Direction" },
      long: { de: "Long", en: "Long" },
      short: { de: "Short", en: "Short" },
      entryPrice: { de: "Entry-Preis", en: "Entry price" },
      stopLossOptional: { de: "Stop-Loss (optional)", en: "Stop-loss (optional)" },
      takeProfitOptional: { de: "Take-Profit (optional)", en: "Take-profit (optional)" },
      positionSize: { de: "Positionsgröße (USD)", en: "Position size (USD)" },
      entryDate: { de: "Entry-Datum", en: "Entry date" },
      notes: { de: "Notizen", en: "Notes" },
      notesPlaceholder: { de: "Warum bin ich rein? Was war der Plan?", en: "Why did I enter? What was the plan?" },
      saving: { de: "Speichere…", en: "Saving…" },
      addTrade: { de: "+ Trade hinzufügen", en: "+ Add trade" },
      aiAnalysisHeading: { de: "KI-Analyse", en: "AI analysis" },
      aiAnalysisNote: {
        de: "Lässt Claude Muster in deinem Journal suchen (Trefferquote, Risikomanagement, wiederkehrende Fehler). Max. 5 Analysen pro Tag.",
        en: "Lets Claude look for patterns in your journal (win rate, risk management, recurring mistakes). Max. 5 analyses per day.",
      },
      analyzing: { de: "Analysiere…", en: "Analyzing…" },
      analyzeButton: { de: "🤖 KI-Analyse meines Journals", en: "🤖 AI analysis of my journal" },
      history: { de: "Trade-Historie", en: "Trade history" },
      loadingSuffix: { de: "(lädt…)", en: "(loading…)" },
      noTrades: { de: "Noch keine Trades erfasst.", en: "No trades recorded yet." },
      thEntry: { de: "Entry", en: "Entry" },
      thExit: { de: "Exit", en: "Exit" },
      thStopTarget: { de: "Stop / Target", en: "Stop / target" },
      thPnl: { de: "PnL", en: "PnL" },
      thRMultiple: { de: "R-Multiple", en: "R-multiple" },
      thNotes: { de: "Notizen", en: "Notes" },
      exitPricePlaceholder: { de: "Exit-Preis", en: "Exit price" },
      close: { de: "Schließen", en: "Close" },
      open: { de: "offen", en: "open" },
      disclaimer: {
        de: "Rein manuelles Trade-Tracking, keine Anbindung an eine Exchange. Positionsgröße ist der USD-Notionalwert, PnL wird daraus berechnet, nicht gespeichert. Keine Anlageberatung.",
        en: "Purely manual trade tracking, no connection to an exchange. Position size is the USD notional value, PnL is calculated from it, not stored. Not investment advice.",
      },
    },
    alerts: {
      title: { de: "Preis-Alarme", en: "Price Alerts" },
      subtitle: { de: "Einmalige Benachrichtigung, wenn ein Coin eine Schwelle erreicht", en: "One-time notification when a coin reaches a threshold" },
      newAlert: { de: "Neuer Alarm", en: "New alert" },
      coin: { de: "Coin", en: "Coin" },
      direction: { de: "Richtung", en: "Direction" },
      above: { de: "über", en: "above" },
      below: { de: "unter", en: "below" },
      targetPrice: { de: "Zielpreis (USD)", en: "Target price (USD)" },
      createAlert: { de: "Alarm erstellen", en: "Create alert" },
      note: {
        de: "Wird 1x täglich geprüft (gegen das 24h-Hoch/Tief des jeweiligen Coins, damit ein kurzes Über-/Unterschreiten zwischen zwei Prüfungen nicht verpasst wird) -- keine Echtzeit-Benachrichtigung. Löst einmalig aus und wird danach automatisch entfernt.",
        en: "Checked once daily (against the coin's 24h high/low, so a brief crossing between two checks isn't missed) -- not a real-time notification. Triggers once and is then automatically removed.",
      },
      activeAlerts: { de: "Aktive Alarme", en: "Active alerts" },
      loading: { de: "Lade…", en: "Loading…" },
      noAlerts: { de: "Noch keine Alarme angelegt.", en: "No alerts created yet." },
      aboveArrow: { de: "▲ über", en: "▲ above" },
      belowArrow: { de: "▼ unter", en: "▼ below" },
      currentPrice: { de: "(aktuell ${{price}})", en: "(currently ${{price}})" },
      deleteAlert: { de: "Alarm löschen", en: "Delete alert" },
      disclaimer: {
        de: "Preis-Alarme werden 1x täglich geprüft (Vercel Free-Tier-Limit für Cron-Jobs), nicht in Echtzeit. Keine Anlageberatung.",
        en: "Price alerts are checked once daily (Vercel free-tier limit for cron jobs), not in real time. Not investment advice.",
      },
    },
    riskReward: {
      title: { de: "R:R-Rechner", en: "R:R Calculator" },
      subtitle: { de: "Positionsgröße und Risiko/Rendite-Verhältnis vor dem Einstieg berechnen", en: "Calculate position size and risk/reward ratio before entering" },
      inputs: { de: "Eingaben", en: "Inputs" },
      entryPrice: { de: "Entry-Preis", en: "Entry price" },
      stopLoss: { de: "Stop-Loss", en: "Stop-loss" },
      takeProfit: { de: "Take-Profit", en: "Take-profit" },
      accountSize: { de: "Kontogröße (USD)", en: "Account size (USD)" },
      riskPerTrade: { de: "Risiko pro Trade (%)", en: "Risk per trade (%)" },
      riskRewardRatio: { de: "Risiko/Rendite-Verhältnis", en: "Risk/reward ratio" },
      riskRewardNote: { de: "Wie viel Rendite pro riskierter Einheit", en: "How much return per unit risked" },
      recommendedSize: { de: "Empfohlene Positionsgröße", en: "Recommended position size" },
      fillInFields: { de: "Entry, Stop-Loss, Kontogröße und Risiko% ausfüllen", en: "Fill in entry, stop-loss, account size, and risk%" },
      stopDistance: { de: "Stop-Abstand: {{pct}}%", en: "Stop distance: {{pct}}%" },
      riskPossibleProfit: { de: "Risiko / möglicher Gewinn", en: "Risk / possible profit" },
      atStopOrTarget: { de: "Bei Erreichen von Stop-Loss bzw. Take-Profit", en: "If stop-loss or take-profit is reached" },
      disclaimer: {
        de: "Reine Positionsgrößen-Berechnung auf Basis deiner Eingaben, kein Abgleich mit echten Kursen. Keine Anlageberatung.",
        en: "Pure position-size calculation based on your inputs, no reconciliation with real prices. Not investment advice.",
      },
    },
    chartAnalysis: {
      title: { de: "Chart-Analyse", en: "Chart Analysis" },
      subtitle: { de: "Chart hochladen, KI beschreibt mögliche Szenarien", en: "Upload a chart, AI describes possible scenarios" },
      errorProcessImage: { de: "Bild konnte nicht verarbeitet werden.", en: "Could not process the image." },
      errorReadImage: { de: "Bild konnte nicht gelesen werden.", en: "Could not read the image." },
      errorNotImage: { de: "Bitte ein Bild hochladen (PNG, JPEG, WebP oder GIF).", en: "Please upload an image (PNG, JPEG, WebP, or GIF)." },
      errorTooLarge: { de: "Bild zu groß (max. 20MB).", en: "Image too large (max. 20MB)." },
      errorTooLargeAnalysis: { de: "Bild zu groß für die Analyse -- bitte ein kleineres Bild versuchen.", en: "Image too large for analysis -- please try a smaller image." },
      errorUnexpected: { de: "Unerwarteter Serverfehler ({{status}}).", en: "Unexpected server error ({{status}})." },
      uploadHeading: { de: "Chart hochladen", en: "Upload chart" },
      uploadLabel: {
        de: "Bild (PNG, JPEG, WebP, GIF -- max. 20MB, wird vor dem Hochladen automatisch verkleinert)",
        en: "Image (PNG, JPEG, WebP, GIF -- max. 20MB, automatically downscaled before upload)",
      },
      previewAlt: { de: "Chart-Vorschau", en: "Chart preview" },
      coinLabel: { de: "Coin (für echte Marktdaten)", en: "Coin (for real market data)" },
      coinNone: { de: "Kein Coin / anderer Vermögenswert", en: "No coin / other asset" },
      horizon: { de: "Horizont", en: "Horizon" },
      dayTrade: { de: "Day-Trade", en: "Day trade" },
      swingTrade: { de: "Swing-Trade", en: "Swing trade" },
      analyzing: { de: "Analysiere…", en: "Analyzing…" },
      analyzeButton: { de: "🔍 Chart analysieren", en: "🔍 Analyze chart" },
      maxPerDay: { de: "Max. 5 Analysen pro Tag.", en: "Max. 5 analyses per day." },
      disclaimer: {
        de: "Reine Bild-Erkennung durch Claude -- keine echten Kursdaten, keine statistische Wahrscheinlichkeit, kein Ersatz für eigene Prüfung. Priorisierte Szenarien werden bewusst in Worten statt in Prozentzahlen ausgedrückt, um keine Genauigkeit vorzutäuschen, die eine Bild-Analyse nicht liefern kann. Keine Anlageberatung.",
        en: "Purely image recognition by Claude -- no real price data, no statistical probability, no substitute for your own review. Prioritized scenarios are deliberately expressed in words rather than percentages, to avoid implying a precision that image analysis cannot deliver. Not investment advice.",
      },
      disclaimerWithData: {
        de: "Bild-Erkennung durch Claude, angereichert mit echten Marktdaten (Preis, RSI, MACD, Zyklus-Kontext) für den gewählten Coin -- trotzdem keine statistische Wahrscheinlichkeit, kein Ersatz für eigene Prüfung. Priorisierte Szenarien werden bewusst in Worten statt in Prozentzahlen ausgedrückt. Keine Anlageberatung.",
        en: "Image recognition by Claude, enriched with real market data (price, RSI, MACD, cycle context) for the selected coin -- still no statistical probability, no substitute for your own review. Prioritized scenarios are deliberately expressed in words rather than percentages. Not investment advice.",
      },
    },
    pushButton: {
      notConfigured: { de: "Push ist noch nicht konfiguriert (VAPID Key fehlt).", en: "Push is not configured yet (VAPID key missing)." },
      permissionDenied: { de: "Berechtigung wurde nicht erteilt.", en: "Permission was not granted." },
      saveFailed: { de: "Speichern fehlgeschlagen.", en: "Failed to save." },
      iosTooltip: {
        de: 'Auf iPhone/iPad funktionieren Push-Benachrichtigungen nur als installierte App: Teilen-Symbol → "Zum Home-Bildschirm hinzufügen", dann von dort öffnen.',
        en: 'On iPhone/iPad, push notifications only work as an installed app: Share icon → "Add to Home Screen", then open from there.',
      },
      iosButton: { de: "🔔 Push (App-Installation nötig)", en: "🔔 Push (app install required)" },
      disableTooltip: { de: "Push-Benachrichtigungen deaktivieren", en: "Disable push notifications" },
      enableTooltip: { de: "Bei Kaufsignalen benachrichtigen lassen", en: "Get notified on buy signals" },
      active: { de: "🔔 Push aktiv", en: "🔔 Push active" },
      enable: { de: "🔔 Push aktivieren", en: "🔔 Enable push" },
    },
    installPrompt: {
      iosHint: { de: 'Zum Startbildschirm hinzufügen: Teilen-Symbol → "Zum Home-Bildschirm"', en: 'Add to Home Screen: Share icon → "Add to Home Screen"' },
      genericHint: { de: "Als App installieren für schnelleren Zugriff", en: "Install as an app for faster access" },
      install: { de: "Installieren", en: "Install" },
    },
};

// Rein clientseitige Anzeige-Übersetzung für die kurzen Signal-Labels aus
// lib/signals.js (macdSignal/rsiLabel/smaSignal/combineSignal/... geben
// German-Strings zurück). BEWUSST NICHT lib/signals.js selbst geändert --
// dieselben Funktionen laufen auch serverseitig (Cron-Push-Text,
// Backtest-/Optimizer-/Walk-Forward-Engine, KI-Analyse-Prompt) und dürfen
// dort nicht am Sprachumschalter hängen. Nur beim Rendern auf der
// Dashboard-Seite angewendet. Fällt bei unbekanntem Text auf den
// Original-String zurück (nie eine leere Anzeige).
const SIGNAL_LABEL_MAP = {
  Kaufen: "Buy",
  Verkaufen: "Sell",
  "Halten (bullish)": "Hold (bullish)",
  "Halten (bearish)": "Hold (bearish)",
  Neutral: "Neutral",
  Bullish: "Bullish",
  Bearish: "Bearish",
  "Kaufen (Crossover)": "Buy (crossover)",
  "Verkaufen (Crossover)": "Sell (crossover)",
  "Unteres Band (überverkauft)": "Lower band (oversold)",
  "Oberes Band (überkauft)": "Upper band (overbought)",
  "Nahe unterem Band": "Near lower band",
  "Nahe oberem Band": "Near upper band",
  "Mittelband-Bereich": "Middle-band range",
  Akkumulation: "Accumulation",
  Distribution: "Distribution",
  "Akkumulation (schwach)": "Accumulation (weak)",
  "Distribution (schwach)": "Distribution (weak)",
  "Risk-on": "Risk-on",
  "Risk-off": "Risk-off",
  Unbekannt: "Unknown",
  "n/a": "n/a",
  "Kaufen (Trendwechsel)": "Buy (trend change)",
  "Verkaufen (Trendwechsel)": "Sell (trend change)",
  "Halten (Aufwärtstrend)": "Hold (uptrend)",
  "Halten (Abwärtstrend)": "Hold (downtrend)",
};

const SIGNAL_LABEL_PATTERNS = [
  [/ – Überkauft$/, " – Overbought"],
  [/ – Überverkauft$/, " – Oversold"],
  [/ – Neutral$/, " – Neutral"],
  [/^Top-Trader ([+-]?\d+)% longer als Ø$/, "Top traders $1% longer than avg"],
  [/^Top-Trader (-?\d+)% weniger long als Ø$/, "Top traders $1% less long than avg"],
  [/^Top-Trader ([+-]?\d+)% vs Ø$/, "Top traders $1% vs avg"],
  [/^([\d.]+)% Spread \(eng\)$/, "$1% spread (tight)"],
  [/^([\d.]+)% Spread \(weit\)$/, "$1% spread (wide)"],
  [/^([\d.]+)% Spread$/, "$1% spread"],
  [/vs Ø/, "vs avg"],
];

// Übersetzt bekannte Supabase-Auth-Fehlermeldungen (kommen als rohe,
// englische error.message-Strings von supabase-js) in verständliche
// DE/EN-Texte -- ohne diese Zuordnung würde z.B. "email rate limit
// exceeded" 1:1 im UI landen. Eigene, in pages/api/auth/callback.js
// gesetzte Marker (kein Supabase-Text, siehe dort) werden genauso
// behandelt wie Supabase-Originalmeldungen. Unbekannte Meldungen fallen
// auf eine generische, übersetzte Meldung zurück -- NIE der rohe
// Provider-String, der könnte technische Details preisgeben.
const AUTH_ERROR_PATTERNS = [
  [
    /rate limit/i,
    {
      de: "Es wurde vor Kurzem bereits ein Anmeldelink versendet. Bitte warte kurz und prüfe auch deinen Spam-Ordner.",
      en: "A login link was already sent recently. Please wait a bit and also check your spam folder.",
    },
  ],
  [
    /invalid login credentials/i,
    { de: "E-Mail oder Passwort ist falsch.", en: "Email or password is incorrect." },
  ],
  [
    /email not confirmed/i,
    { de: "Bitte bestätige zuerst deine E-Mail-Adresse.", en: "Please confirm your email address first." },
  ],
  [
    /^link_invalid$/,
    {
      de: "Dieser Anmeldelink ist ungültig oder abgelaufen. Bitte fordere einen neuen an.",
      en: "This login link is invalid or has expired. Please request a new one.",
    },
  ],
];

const AUTH_ERROR_FALLBACK = { de: "Anmeldung fehlgeschlagen. Bitte versuch es erneut.", en: "Login failed. Please try again." };

export function translateAuthError(message, lang) {
  const entry = AUTH_ERROR_PATTERNS.find(([pattern]) => pattern.test(message || ""));
  const strings = entry ? entry[1] : AUTH_ERROR_FALLBACK;
  return lang === "en" ? strings.en : strings.de;
}

export function translateSignalLabel(text, lang) {
  if (lang !== "en" || text == null) return text;
  if (Object.prototype.hasOwnProperty.call(SIGNAL_LABEL_MAP, text)) return SIGNAL_LABEL_MAP[text];
  for (const [pattern, replacement] of SIGNAL_LABEL_PATTERNS) {
    if (pattern.test(text)) return text.replace(pattern, replacement);
  }
  return text;
}

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
