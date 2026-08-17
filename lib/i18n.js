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
    step1Title: { de: "Willkommen beim Krypto Signal Dashboard 👋", en: "Welcome to Krypto Signal Dashboard 👋" },
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
    title: { de: "Krypto Signal Dashboard", en: "Krypto Signal Dashboard" },
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
    disclaimer: {
      de: "Keine Anlageberatung. Kryptowährungen sind hoch volatil – Investitionen können zum Totalverlust führen.",
      en: "Not investment advice. Cryptocurrencies are highly volatile -- investments can result in a total loss.",
    },
    tf4h: { de: "4 Stunden", en: "4 hours" },
    tf1d: { de: "Täglich", en: "Daily" },
    tf1w: { de: "Wöchentlich", en: "Weekly" },
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
