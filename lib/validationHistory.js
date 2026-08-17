// Öffentliche Validierungs-Historie (pages/validation.js): jeder Faktor, der
// je für die Kaufen/Verkaufen-Signale getestet wurde, mit Datum, Methode und
// echtem Ergebnis -- auch die Fälle, in denen etwas NICHT geholfen hat.
// Neueste zuerst. Beim Hinzufügen eines neuen empirisch getesteten Faktors
// (Multi-Coin Walk-Forward über 365/730/850 Tage, das etablierte Verfahren
// dieses Projekts) hier einen Eintrag ergänzen -- das ist die einzige Stelle,
// die gepflegt werden muss. factor/hypothesis/method/result sind je {de, en}
// für den DE/EN-Sprachumschalter (lib/i18n.js).
//
// outcome steuert Badge-Farbe/Text in pages/validation.js:
// "adopted" (grün, Übernommen) | "confirmed" (grün, Bleibt aktiv) |
// "rejected" (grau, Kein Effekt gefunden) | "harmful" (rot, Schadet mehr als
// es hilft) | "optional" (gelb, Gemischt -- optional verfügbar)
export const VALIDATION_HISTORY = [
  {
    id: "supertrend-donchian",
    date: "2026-08-16",
    factor: { de: "SuperTrend + Donchian-Kanal-Ausbruch", en: "SuperTrend + Donchian channel breakout" },
    hypothesis: {
      de: "Beides sind in unabhängigen Backtesting-Vergleichen (Web-Recherche 08/2026) häufig genannte Top-Performer für Trendfolge-Strategien -- könnten sie als zusätzliche Score-Stimme oder als Ersatz für den bestehenden SMA-Crossover die Rendite verbessern?",
      en: "Both are frequently cited as top performers for trend-following strategies in independent backtesting comparisons (web research 08/2026) -- could they improve returns as an additional score vote or as a replacement for the existing SMA crossover?",
    },
    method: {
      de: "Multi-Coin Walk-Forward über 365/730/850 Tage, je 2 Varianten: (a) als zusätzliche Score-Stimme neben SMA/MACD (gleiche Gewichtung wie starke Kerze/Marubozu), (b) als Ersatz für SMA (useSma=0), um Redundanz zwischen zwei Trendfolge-Signalen auszuschließen.",
      en: "Multi-coin walk-forward over 365/730/850 days, 2 variants each: (a) as an additional score vote alongside SMA/MACD (same weight as strong candle/Marubozu), (b) as a replacement for SMA (useSma=0), to rule out redundancy between two trend-following signals.",
    },
    result: {
      de: "Kein robuster Vorteil in beiden Varianten. Als Zusatzstimme schadet SuperTrend in allen drei Fenstern durchgängig (z.B. 850 Tage: -7,6% statt -0,3% Baseline). Donchian als Ersatz für SMA sah im 365-Tage-Fenster stark aus (Sharpe +0,38 statt -0,69), brach aber im 730- und v.a. 850-Tage-Fenster massiv ein (-17,3% Rendite) -- genau das Muster, vor dem dieses Projekt sich wiederholt selbst warnt: ein einzelnes kurzes Fenster ist kein verlässlicher Beweis. Beide bleiben als Opt-in-Parameter im Code erhalten (useSuperTrend/useDonchian), aber standardmäßig aus.",
      en: "No robust advantage in either variant. As an additional vote, SuperTrend hurts consistently across all three windows (e.g. 850 days: -7.6% instead of the -0.3% baseline). Donchian as a replacement for SMA looked strong in the 365-day window (Sharpe +0.38 instead of -0.69), but collapsed massively in the 730- and especially the 850-day window (-17.3% return) -- exactly the pattern this project repeatedly warns itself about: a single short window is not reliable proof. Both remain in the code as opt-in parameters (useSuperTrend/useDonchian), but off by default.",
    },
    outcome: "rejected",
  },
  {
    id: "nasdaq-sp500-retest-2026",
    date: "2026-08-16",
    factor: { de: "Nasdaq- und S&P-500-Trend im Makro-Score (Re-Test)", en: "Nasdaq and S&P 500 trend in the macro score (re-test)" },
    hypothesis: {
      de: "Die ursprünglichen Nasdaq/S&P-500-Tests (siehe unten, 2026-08-09/11) liefen z.T. nur als Korrelationsstudie ohne echten Walk-Forward-Test (S&P 500) bzw. auf einer älteren Engine-Version -- verdient ein erneuter, direkter Vergleichstest mit dem aktuellen Setup (Makro-Gewicht 2,0, gefixte cash-Guard-Logik) eine zweite Chance?",
      en: "The original Nasdaq/S&P 500 tests (see below, 2026-08-09/11) partly ran only as a correlation study without a real walk-forward test (S&P 500), or on an older engine version -- does a fresh, direct comparison test with the current setup (macro weight 2.0, fixed cash-guard logic) deserve a second chance?",
    },
    method: {
      de: "Erstmals ein echter useSp500-Score-Opt-in ergänzt (symmetrisch zu useNasdaq) und beide per Multi-Coin Walk-Forward über 365/730/850 Tage einzeln UND kombiniert getestet.",
      en: "Added a real useSp500 score opt-in for the first time (symmetric to useNasdaq) and tested both via multi-coin walk-forward over 365/730/850 days individually AND combined.",
    },
    result: {
      de: "Beide bestätigen die ursprüngliche Ablehnung, diesmal mit vollständigen Daten statt nur einer Korrelationsstudie: bei kurzen/mittleren Fenstern praktisch wirkungslos (der ±5%-Schwellenwert wird selten überschritten, Ergebnis oft byte-identisch zur Baseline), im verlässlichsten 850-Tage-Fenster aber klar schädlich (S&P 500: -8,8% statt -0,3% Baseline; Nasdaq: -5,9%; kombiniert: -8,6%). Beide bleiben aus.",
      en: "Both confirm the original rejection, this time with complete data instead of just a correlation study: essentially no effect at short/medium windows (the ±5% threshold is rarely crossed, result often byte-identical to the baseline), but clearly harmful in the most reliable 850-day window (S&P 500: -8.8% instead of the -0.3% baseline; Nasdaq: -5.9%; combined: -8.6%). Both stay off.",
    },
    outcome: "rejected",
  },
  {
    id: "macroweight-threshold-sweep",
    date: "2026-08-13",
    factor: { de: "Makro-Gewicht × Signal-Schwelle (systematische Suche)", en: "Macro weight × signal threshold (systematic search)" },
    hypothesis: {
      de: "Eine gezielte Suche über mehrere Makro-Gewichte (1,5/2,0/3,0) und Signal-Schwellen (1,0/1,5/2,0) könnte eine Kombination finden, die robuster performt als die aktuellen Standardwerte (Gewicht 2,0, Schwelle 1,5).",
      en: "A targeted search over several macro weights (1.5/2.0/3.0) and signal thresholds (1.0/1.5/2.0) might find a combination that performs more robustly than the current defaults (weight 2.0, threshold 1.5).",
    },
    method: {
      de: "9 Kombinationen × Multi-Coin Walk-Forward über 365/730/850 Tage (27 Läufe) -- jeder Lauf durchsucht zusätzlich intern das bestehende SMA/RSI/ADX-Raster pro Fold.",
      en: "9 combinations × multi-coin walk-forward over 365/730/850 days (27 runs) -- each run additionally searches the existing SMA/RSI/ADX grid internally per fold.",
    },
    result: {
      de: "Bei fester Standard-Gewichtung (2,0) gewinnt in jedem der drei Zeitfenster eine ANDERE Schwelle (1,0 gewinnt 365 Tage, 2,0 gewinnt 730 Tage knapp, 1,5 -- der Standard -- gewinnt 850 Tage klar). Keine einzige der 9 getesteten Kombinationen schlägt die aktuellen Standardwerte robust über alle drei Fenster hinweg -- ein auf den ersten Blick gut aussehender Fenster-Durchschnitt entpuppte sich bei genauerem Hinsehen als genau das Rausch-Muster, vor dem dieses Projekt sich wiederholt selbst gewarnt hat. Die bestehenden Standardwerte bleiben deshalb unverändert -- sie sind unter den getesteten Alternativen bereits nahe am Optimum.",
      en: "With the default weight held fixed (2.0), a DIFFERENT threshold wins in each of the three time windows (1.0 wins 365 days, 2.0 narrowly wins 730 days, 1.5 -- the default -- clearly wins 850 days). Not a single one of the 9 tested combinations robustly beats the current defaults across all three windows -- an average that looked good across windows at first glance turned out, on closer inspection, to be exactly the noise pattern this project has repeatedly warned itself about. The existing defaults therefore remain unchanged -- they're already close to optimal among the tested alternatives.",
    },
    outcome: "confirmed",
  },
  {
    id: "adx-trendfilter",
    date: "2026-08-12",
    factor: { de: "ADX-Trendfilter", en: "ADX trend filter" },
    hypothesis: {
      de: "Ein Trendstärke-Filter (ADX) könnte Whipsaws (mehrere Stop-Losses in Folge in Seitwärtsphasen) verhindern.",
      en: "A trend-strength filter (ADX) might prevent whipsaws (multiple consecutive stop-losses during sideways phases).",
    },
    method: {
      de: "Multi-Coin Walk-Forward: 5 Coins × 4 ADX-Stufen (kein Filter/15/20/25) × 365/730/850 Tage.",
      en: "Multi-coin walk-forward: 5 coins × 4 ADX levels (no filter/15/20/25) × 365/730/850 days.",
    },
    result: {
      de: "Kein robuster globaler Effekt: half Bitcoin/Ethereum/XRP teils deutlich, schadete Solana/Bittensor teils deutlich (bis -73% im 850-Tage-Fenster) -- coin-abhängig statt echter Trendfilter-Effekt. Im konkreten Anwendungsfall (Bitcoin, 2x Hebel, Long+Short, 10% Stop-Loss) drehte ADX 20 das Ergebnis aber von -32,3% auf +2,7%, weil eine dreiteilige Whipsaw-Sequenz zu einem einzigen durchgehenden Trade wurde.",
      en: "No robust global effect: sometimes helped Bitcoin/Ethereum/XRP significantly, sometimes hurt Solana/Bittensor significantly (up to -73% in the 850-day window) -- coin-dependent rather than a genuine trend-filter effect. In one concrete use case (Bitcoin, 2x leverage, long+short, 10% stop-loss), however, ADX 20 turned the result from -32.3% into +2.7%, because a three-part whipsaw sequence became a single continuous trade.",
    },
    outcome: "optional",
  },
  {
    id: "take-profit",
    date: "2026-08-12",
    factor: { de: "Take-Profit-Exit", en: "Take-profit exit" },
    hypothesis: {
      de: "Ein festes Gewinnziel könnte die Rendite gegenüber dem bisherigen rein signalgetriebenen Ausstieg verbessern.",
      en: "A fixed profit target might improve returns compared to the previous purely signal-driven exit.",
    },
    method: {
      de: "Multi-Coin Walk-Forward: 6 Kombinationen (15/20/30% solo, 20/30% im Bracket mit 15% Stop-Loss) × 365/730/850 Tage.",
      en: "Multi-coin walk-forward: 6 combinations (15/20/30% solo, 20/30% bracketed with a 15% stop-loss) × 365/730/850 days.",
    },
    result: {
      de: "In den beiden längeren, verlässlicheren Zeitfenstern durchgängig schlechter als gar kein Gewinnziel: im 730-Tage-Fenster fiel die Zahl profitabler Folds bei jeder einzelnen Variante auf 0 von 4 (Baseline: 1 von 4), im 850-Tage-Fenster bis zu -11% Rendite gegenüber +13,8% ohne Gewinnziel. Die Strategie lässt Gewinner sonst per Signal-Ausstieg laufen -- ein festes Ziel kappt diese Trends vorzeitig.",
      en: "Consistently worse than no profit target at all in the two longer, more reliable time windows: in the 730-day window the number of profitable folds dropped to 0 of 4 for every single variant (baseline: 1 of 4), in the 850-day window down to -11% return versus +13.8% with no profit target. The strategy otherwise lets winners run via a signal-based exit -- a fixed target cuts these trends short prematurely.",
    },
    outcome: "harmful",
  },
  {
    id: "nasdaq-macro",
    date: "2026-08-11",
    factor: { de: "Nasdaq-Trend im Makro-Score", en: "Nasdaq trend in the macro score" },
    hypothesis: {
      de: "Der Nasdaq folgt laut einer verbreiteten These der globalen Liquidität (M2) -- ein positiver Trend könnte auch für Bitcoin bullish sein.",
      en: "According to a common thesis, the Nasdaq tracks global liquidity (M2) -- a positive trend might also be bullish for Bitcoin.",
    },
    method: {
      de: "Erst Pearson-Korrelationsstudie (n≈2.050 Handelstage, 2018-2026) zwischen 90-Tage-Nasdaq-Trend und Bitcoins Forward-14-Tage-Rendite, danach Multi-Coin Walk-Forward mit/ohne Score-Beitrag über 365/730/850 Tage.",
      en: "First a Pearson correlation study (n≈2,050 trading days, 2018-2026) between the 90-day Nasdaq trend and Bitcoin's forward 14-day return, then a multi-coin walk-forward with/without the score contribution over 365/730/850 days.",
    },
    result: {
      de: "Die Korrelationsstudie war vielversprechend (r≈0,10, schwach aber konsistent positiv). Der Walk-Forward-Test zeigte trotzdem keinen robusten Vorteil: im 730-Tage-Fenster deutlich schlechter mit Score-Beitrag (Sharpe -0,29 statt -0,16), im 850-Tage-Fenster etwas besser (0,18 statt 0,14) -- uneinheitlich über die Zeitfenster. Eine reine Korrelationsstudie reicht offenbar nicht als Beweis.",
      en: "The correlation study looked promising (r≈0.10, weak but consistently positive). The walk-forward test still showed no robust advantage: clearly worse with the score contribution in the 730-day window (Sharpe -0.29 instead of -0.16), somewhat better in the 850-day window (0.18 instead of 0.14) -- inconsistent across time windows. A pure correlation study apparently isn't enough proof on its own.",
    },
    outcome: "rejected",
  },
  {
    id: "sp500-macro",
    date: "2026-08-09",
    factor: { de: "S&P 500-Trend im Makro-Score", en: "S&P 500 trend in the macro score" },
    hypothesis: {
      de: "Analog zum Nasdaq-Test: könnte der S&P-500-Trend die Kaufen/Verkaufen-Entscheidung verbessern?",
      en: "Analogous to the Nasdaq test: could the S&P 500 trend improve the buy/sell decision?",
    },
    method: {
      de: "Pearson-Korrelationsstudie (n≈2.050 Handelstage) zwischen S&P-500-Trend (mehrere Lookback-Fenster) und Bitcoins Forward-14-Tage-Rendite.",
      en: "Pearson correlation study (n≈2,050 trading days) between the S&P 500 trend (several lookback windows) and Bitcoin's forward 14-day return.",
    },
    result: {
      de: "Korrelation nahe null bzw. uneinheitlich selbst im besten Lookback-Fenster -- deutlich schwächer als beim Nasdaq. Erreichte nicht einmal die Schwelle für einen Walk-Forward-Test.",
      en: "Correlation near zero or inconsistent even in the best lookback window -- clearly weaker than for the Nasdaq. Didn't even reach the threshold to warrant a walk-forward test.",
    },
    outcome: "rejected",
  },
  {
    id: "marubozu",
    date: "2026-08-09",
    factor: { de: "Marubozu-Kerzenmuster", en: "Marubozu candle pattern" },
    hypothesis: {
      de: "Eine Kerze mit fast keinen Dochten (Körper ≥90% der Tagesspanne) könnte ein starkes Richtungssignal sein.",
      en: "A candle with almost no wicks (body ≥90% of the daily range) might be a strong directional signal.",
    },
    method: {
      de: "Multi-Coin Walk-Forward über 365/730/850 Tage, plus Diagnose-Check gegen 4 Jahre echte BTC-Daten vor dem Walk-Forward-Test.",
      en: "Multi-coin walk-forward over 365/730/850 days, plus a diagnostic check against 4 years of real BTC data before the walk-forward test.",
    },
    result: {
      de: "Praktisch kein Effekt: das Muster tritt nur an rund 1,4% der Tage auf -- zu selten, um den kombinierten Score bei Gewicht 0,5 spürbar zu bewegen. Alle drei Zeitfenster unterschieden sich um weniger als 0,3 Prozentpunkte Rendite von der Basis-Version.",
      en: "Practically no effect: the pattern occurs on only about 1.4% of days -- too rare to noticeably move the combined score at a weight of 0.5. All three time windows differed from the baseline version by less than 0.3 percentage points of return.",
    },
    outcome: "rejected",
  },
  {
    id: "starke-kerze",
    date: "2026-08-09",
    factor: { de: '"Starke Kerze" (ATR-basierte Range-Kerze)', en: '"Strong candle" (ATR-based range candle)' },
    hypothesis: {
      de: "Ein Tag mit ungewöhnlich großer Handelsspanne und eindeutigem Schluss nahe Hoch/Tief könnte ein verlässliches Momentum-Signal sein.",
      en: "A day with an unusually large trading range and a clear close near the high/low might be a reliable momentum signal.",
    },
    method: { de: "Multi-Coin Walk-Forward über 365/730/850 Tage.", en: "Multi-coin walk-forward over 365/730/850 days." },
    result: {
      de: "Gemischtes Bild ohne klare Richtung: im 730-Tage-Fenster klar besser, im 850-Tage-Fenster klar schlechter, im 365-Tage-Fenster neutral.",
      en: "Mixed picture with no clear direction: clearly better in the 730-day window, clearly worse in the 850-day window, neutral in the 365-day window.",
    },
    outcome: "rejected",
  },
  {
    id: "rsi-fg-volume",
    date: "2026-08-11",
    factor: { de: "RSI, Fear & Greed, Volumen (einzeln und kombiniert)", en: "RSI, Fear & Greed, volume (individually and combined)" },
    hypothesis: {
      de: "Frühere Einzeltests wirkten leicht negativ -- sollten diese drei ursprünglichen Signal-Bestandteile deaktiviert werden?",
      en: "Earlier individual tests looked slightly negative -- should these three original signal components be disabled?",
    },
    method: {
      de: "Alle 7 möglichen An/Aus-Kombinationen (einzeln, paarweise, alle drei zusammen) getestet, Multi-Coin Walk-Forward über 365/730/850 Tage.",
      en: "Tested all 7 possible on/off combinations (individually, in pairs, all three together), multi-coin walk-forward over 365/730/850 days.",
    },
    result: {
      de: "Die Basis-Version (alle drei aktiv) war im 730- und 850-Tage-Fenster die beste oder gleichauf beste Kombination -- im 850-Tage-Fenster z.B. 17,3% Rendite/0,15 Sharpe gegenüber 7,9-14,4%/-0,62 bis +0,03 bei den Abschalt-Varianten. Im rauschigeren 365-Tage-Fenster wirkten manche Abschaltungen zunächst besser, aber die Zahl profitabler Folds sank dabei fast immer von 2 auf 1 -- kein robustes Muster.",
      en: "The baseline version (all three active) was the best or tied-best combination in the 730- and 850-day windows -- e.g. in the 850-day window, 17.3% return/0.15 Sharpe versus 7.9-14.4%/-0.62 to +0.03 for the disabled variants. In the noisier 365-day window, some disabled variants initially looked better, but the number of profitable folds nearly always dropped from 2 to 1 -- no robust pattern.",
    },
    outcome: "confirmed",
  },
  {
    id: "obv",
    date: "2026-08-08",
    factor: { de: "On-Balance-Volume", en: "On-balance volume" },
    hypothesis: {
      de: "Ein Crossover des kumulierten Volumens gegen seinen eigenen gleitenden Durchschnitt könnte Akkumulations-/Distributionsphasen früh anzeigen.",
      en: "A crossover of cumulative volume against its own moving average might indicate accumulation/distribution phases early.",
    },
    method: { de: "Multi-Coin Walk-Forward über 365/730/850 Tage.", en: "Multi-coin walk-forward over 365/730/850 days." },
    result: { de: "Kein Vorteil gegenüber der Basis-Version.", en: "No advantage over the baseline version." },
    outcome: "rejected",
  },
  {
    id: "stoch-rsi",
    date: "2026-08-08",
    factor: { de: "Stochastic RSI", en: "Stochastic RSI" },
    hypothesis: {
      de: "Eine auf ihr eigenes Hoch/Tief normierte RSI-Reihe reagiert schneller als reines RSI -- könnte das ein besseres Timing liefern?",
      en: "An RSI series normalized to its own high/low reacts faster than plain RSI -- could that give better timing?",
    },
    method: { de: "Multi-Coin Walk-Forward über 365/730/850 Tage.", en: "Multi-coin walk-forward over 365/730/850 days." },
    result: { de: "Kein Vorteil gegenüber der Basis-Version.", en: "No advantage over the baseline version." },
    outcome: "rejected",
  },
  {
    id: "bollinger",
    date: "2026-08-08",
    factor: { de: "Bollinger Bänder", en: "Bollinger Bands" },
    hypothesis: {
      de: "Kurse nahe am oberen/unteren Band könnten überkaufte/überverkaufte Zustände markieren.",
      en: "Prices near the upper/lower band might mark overbought/oversold conditions.",
    },
    method: { de: "Multi-Coin Walk-Forward über 365/730/850 Tage.", en: "Multi-coin walk-forward over 365/730/850 days." },
    result: {
      de: "Kein Vorteil, meist sogar schädlich -- am deutlichsten im 850-Tage-Fenster.",
      en: "No advantage, mostly even harmful -- most pronounced in the 850-day window.",
    },
    outcome: "rejected",
  },
  {
    id: "m2-vix-direction",
    date: "2026-08-08",
    factor: { de: "Score-Richtung von M2-Geldmenge und VIX", en: "Score direction of M2 money supply and VIX" },
    hypothesis: {
      de: "Ursprüngliche Annahme: hohe Liquidität (M2) und Sorglosigkeit (niedriger VIX) sind bullish für Krypto.",
      en: "Original assumption: high liquidity (M2) and complacency (low VIX) are bullish for crypto.",
    },
    method: {
      de: "Analyse der Bitcoin-Forward-14-Tage-Rendite gegen die historischen Ausprägungen beider Faktoren.",
      en: "Analysis of Bitcoin's forward 14-day return against the historical readings of both factors.",
    },
    result: {
      de: "Beide Annahmen waren falsch gepolt: hohe M2-Liquidität und niedriger VIX schnitten historisch schlechter ab als knappe Liquidität bzw. Angst-Phasen (VIX hoch) -- plausibel, weil hohe Liquidität/Sorglosigkeit eher mit späten Bullenmarkt-Phasen zusammenfällt.",
      en: "Both assumptions were reversed: historically, high M2 liquidity and low VIX performed worse than tight liquidity or fear phases (high VIX) -- plausible, since high liquidity/complacency tends to coincide with late bull-market phases.",
    },
    outcome: "adopted",
  },
  {
    id: "macro-weight",
    date: "2026-08-08",
    factor: { de: "Gewichtung des Makro-Regimes im Gesamt-Score", en: "Weighting of the macro regime in the overall score" },
    hypothesis: {
      de: "Das ursprüngliche Gewicht (0,3) war zu niedrig, um die Kaufen/Verkaufen-Schwelle je zu beeinflussen.",
      en: "The original weight (0.3) was too low to ever influence the buy/sell threshold.",
    },
    method: {
      de: "Multi-Coin Walk-Forward mit Gewichten von 0,3 bis 3,0 über 365/730/850 Tage.",
      en: "Multi-coin walk-forward with weights from 0.3 to 3.0 over 365/730/850 days.",
    },
    result: {
      de: "Bei 0,3 kippte das Makro-Signal in den meisten Zeitfenstern praktisch nie die Schwelle. Ab Gewicht 2,0 zeigte sich im 850-Tage-Fenster ein echter, positiver Effekt (Sharpe 0,08 → 0,24) ohne Nachteil in den kürzeren Fenstern.",
      en: "At 0.3, the macro signal practically never tipped the threshold in most time windows. From a weight of 2.0, the 850-day window showed a real, positive effect (Sharpe 0.08 → 0.24) with no downside in the shorter windows.",
    },
    outcome: "adopted",
  },
];
