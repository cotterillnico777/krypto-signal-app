// Öffentliche Validierungs-Historie (pages/validation.js): jeder Faktor, der
// je für die Kaufen/Verkaufen-Signale getestet wurde, mit Datum, Methode und
// echtem Ergebnis -- auch die Fälle, in denen etwas NICHT geholfen hat.
// Neueste zuerst. Beim Hinzufügen eines neuen empirisch getesteten Faktors
// (Multi-Coin Walk-Forward über 365/730/850 Tage, das etablierte Verfahren
// dieses Projekts) hier einen Eintrag ergänzen -- das ist die einzige Stelle,
// die gepflegt werden muss.
//
// outcome steuert Badge-Farbe/Text in pages/validation.js:
// "adopted" (grün, Übernommen) | "confirmed" (grün, Bleibt aktiv) |
// "rejected" (grau, Kein Effekt gefunden) | "harmful" (rot, Schadet mehr als
// es hilft) | "optional" (gelb, Gemischt -- optional verfügbar)
export const VALIDATION_HISTORY = [
  {
    id: "adx-trendfilter",
    date: "2026-08-12",
    factor: "ADX-Trendfilter",
    hypothesis: "Ein Trendstärke-Filter (ADX) könnte Whipsaws (mehrere Stop-Losses in Folge in Seitwärtsphasen) verhindern.",
    method: "Multi-Coin Walk-Forward: 5 Coins × 4 ADX-Stufen (kein Filter/15/20/25) × 365/730/850 Tage.",
    result: "Kein robuster globaler Effekt: half Bitcoin/Ethereum/XRP teils deutlich, schadete Solana/Bittensor teils deutlich (bis -73% im 850-Tage-Fenster) -- coin-abhängig statt echter Trendfilter-Effekt. Im konkreten Anwendungsfall (Bitcoin, 2x Hebel, Long+Short, 10% Stop-Loss) drehte ADX 20 das Ergebnis aber von -32,3% auf +2,7%, weil eine dreiteilige Whipsaw-Sequenz zu einem einzigen durchgehenden Trade wurde.",
    outcome: "optional",
  },
  {
    id: "take-profit",
    date: "2026-08-12",
    factor: "Take-Profit-Exit",
    hypothesis: "Ein festes Gewinnziel könnte die Rendite gegenüber dem bisherigen rein signalgetriebenen Ausstieg verbessern.",
    method: "Multi-Coin Walk-Forward: 6 Kombinationen (15/20/30% solo, 20/30% im Bracket mit 15% Stop-Loss) × 365/730/850 Tage.",
    result: "In den beiden längeren, verlässlicheren Zeitfenstern durchgängig schlechter als gar kein Gewinnziel: im 730-Tage-Fenster fiel die Zahl profitabler Folds bei jeder einzelnen Variante auf 0 von 4 (Baseline: 1 von 4), im 850-Tage-Fenster bis zu -11% Rendite gegenüber +13,8% ohne Gewinnziel. Die Strategie lässt Gewinner sonst per Signal-Ausstieg laufen -- ein festes Ziel kappt diese Trends vorzeitig.",
    outcome: "harmful",
  },
  {
    id: "nasdaq-macro",
    date: "2026-08-11",
    factor: "Nasdaq-Trend im Makro-Score",
    hypothesis: "Der Nasdaq folgt laut einer verbreiteten These der globalen Liquidität (M2) -- ein positiver Trend könnte auch für Bitcoin bullish sein.",
    method: "Erst Pearson-Korrelationsstudie (n≈2.050 Handelstage, 2018-2026) zwischen 90-Tage-Nasdaq-Trend und Bitcoins Forward-14-Tage-Rendite, danach Multi-Coin Walk-Forward mit/ohne Score-Beitrag über 365/730/850 Tage.",
    result: "Die Korrelationsstudie war vielversprechend (r≈0,10, schwach aber konsistent positiv). Der Walk-Forward-Test zeigte trotzdem keinen robusten Vorteil: im 730-Tage-Fenster deutlich schlechter mit Score-Beitrag (Sharpe -0,29 statt -0,16), im 850-Tage-Fenster etwas besser (0,18 statt 0,14) -- uneinheitlich über die Zeitfenster. Eine reine Korrelationsstudie reicht offenbar nicht als Beweis.",
    outcome: "rejected",
  },
  {
    id: "sp500-macro",
    date: "2026-08-09",
    factor: "S&P 500-Trend im Makro-Score",
    hypothesis: "Analog zum Nasdaq-Test: könnte der S&P-500-Trend die Kaufen/Verkaufen-Entscheidung verbessern?",
    method: "Pearson-Korrelationsstudie (n≈2.050 Handelstage) zwischen S&P-500-Trend (mehrere Lookback-Fenster) und Bitcoins Forward-14-Tage-Rendite.",
    result: "Korrelation nahe null bzw. uneinheitlich selbst im besten Lookback-Fenster -- deutlich schwächer als beim Nasdaq. Erreichte nicht einmal die Schwelle für einen Walk-Forward-Test.",
    outcome: "rejected",
  },
  {
    id: "marubozu",
    date: "2026-08-09",
    factor: "Marubozu-Kerzenmuster",
    hypothesis: "Eine Kerze mit fast keinen Dochten (Körper ≥90% der Tagesspanne) könnte ein starkes Richtungssignal sein.",
    method: "Multi-Coin Walk-Forward über 365/730/850 Tage, plus Diagnose-Check gegen 4 Jahre echte BTC-Daten vor dem Walk-Forward-Test.",
    result: "Praktisch kein Effekt: das Muster tritt nur an rund 1,4% der Tage auf -- zu selten, um den kombinierten Score bei Gewicht 0,5 spürbar zu bewegen. Alle drei Zeitfenster unterschieden sich um weniger als 0,3 Prozentpunkte Rendite von der Basis-Version.",
    outcome: "rejected",
  },
  {
    id: "starke-kerze",
    date: "2026-08-09",
    factor: '"Starke Kerze" (ATR-basierte Range-Kerze)',
    hypothesis: "Ein Tag mit ungewöhnlich großer Handelsspanne und eindeutigem Schluss nahe Hoch/Tief könnte ein verlässliches Momentum-Signal sein.",
    method: "Multi-Coin Walk-Forward über 365/730/850 Tage.",
    result: "Gemischtes Bild ohne klare Richtung: im 730-Tage-Fenster klar besser, im 850-Tage-Fenster klar schlechter, im 365-Tage-Fenster neutral.",
    outcome: "rejected",
  },
  {
    id: "rsi-fg-volume",
    date: "2026-08-11",
    factor: "RSI, Fear & Greed, Volumen (einzeln und kombiniert)",
    hypothesis: "Frühere Einzeltests wirkten leicht negativ -- sollten diese drei ursprünglichen Signal-Bestandteile deaktiviert werden?",
    method: "Alle 7 möglichen An/Aus-Kombinationen (einzeln, paarweise, alle drei zusammen) getestet, Multi-Coin Walk-Forward über 365/730/850 Tage.",
    result: "Die Basis-Version (alle drei aktiv) war im 730- und 850-Tage-Fenster die beste oder gleichauf beste Kombination -- im 850-Tage-Fenster z.B. 17,3% Rendite/0,15 Sharpe gegenüber 7,9-14,4%/-0,62 bis +0,03 bei den Abschalt-Varianten. Im rauschigeren 365-Tage-Fenster wirkten manche Abschaltungen zunächst besser, aber die Zahl profitabler Folds sank dabei fast immer von 2 auf 1 -- kein robustes Muster.",
    outcome: "confirmed",
  },
  {
    id: "obv",
    date: "2026-08-08",
    factor: "On-Balance-Volume",
    hypothesis: "Ein Crossover des kumulierten Volumens gegen seinen eigenen gleitenden Durchschnitt könnte Akkumulations-/Distributionsphasen früh anzeigen.",
    method: "Multi-Coin Walk-Forward über 365/730/850 Tage.",
    result: "Kein Vorteil gegenüber der Basis-Version.",
    outcome: "rejected",
  },
  {
    id: "stoch-rsi",
    date: "2026-08-08",
    factor: "Stochastic RSI",
    hypothesis: "Eine auf ihr eigenes Hoch/Tief normierte RSI-Reihe reagiert schneller als reines RSI -- könnte das ein besseres Timing liefern?",
    method: "Multi-Coin Walk-Forward über 365/730/850 Tage.",
    result: "Kein Vorteil gegenüber der Basis-Version.",
    outcome: "rejected",
  },
  {
    id: "bollinger",
    date: "2026-08-08",
    factor: "Bollinger Bänder",
    hypothesis: "Kurse nahe am oberen/unteren Band könnten überkaufte/überverkaufte Zustände markieren.",
    method: "Multi-Coin Walk-Forward über 365/730/850 Tage.",
    result: "Kein Vorteil, meist sogar schädlich -- am deutlichsten im 850-Tage-Fenster.",
    outcome: "rejected",
  },
  {
    id: "m2-vix-direction",
    date: "2026-08-08",
    factor: "Score-Richtung von M2-Geldmenge und VIX",
    hypothesis: "Ursprüngliche Annahme: hohe Liquidität (M2) und Sorglosigkeit (niedriger VIX) sind bullish für Krypto.",
    method: "Analyse der Bitcoin-Forward-14-Tage-Rendite gegen die historischen Ausprägungen beider Faktoren.",
    result: "Beide Annahmen waren falsch gepolt: hohe M2-Liquidität und niedriger VIX schnitten historisch schlechter ab als knappe Liquidität bzw. Angst-Phasen (VIX hoch) -- plausibel, weil hohe Liquidität/Sorglosigkeit eher mit späten Bullenmarkt-Phasen zusammenfällt.",
    outcome: "adopted",
  },
  {
    id: "macro-weight",
    date: "2026-08-08",
    factor: "Gewichtung des Makro-Regimes im Gesamt-Score",
    hypothesis: "Das ursprüngliche Gewicht (0,3) war zu niedrig, um die Kaufen/Verkaufen-Schwelle je zu beeinflussen.",
    method: "Multi-Coin Walk-Forward mit Gewichten von 0,3 bis 3,0 über 365/730/850 Tage.",
    result: "Bei 0,3 kippte das Makro-Signal in den meisten Zeitfenstern praktisch nie die Schwelle. Ab Gewicht 2,0 zeigte sich im 850-Tage-Fenster ein echter, positiver Effekt (Sharpe 0,08 → 0,24) ohne Nachteil in den kürzeren Fenstern.",
    outcome: "adopted",
  },
];
