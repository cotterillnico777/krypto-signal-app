// Ausführlichere Erklärungen als die Dashboard-Tooltips erlauben -- Pull-
// Faktor #3 aus der Retail-/Neuling-Roadmap: eine eigene, öffentliche
// Lern-Seite (pages/glossar.js) statt nur einzeiliger title-Attribute.
// Statische Daten, kein Overengineering, gleiches Muster wie
// lib/validationHistory.js/lib/paramTips.js -- Logik/Styling lebt in der
// Seite, hier nur Inhalt. Jedes Textfeld ist {de, en} für den DE/EN-
// Sprachumschalter (lib/i18n.js) -- pages/glossar.js liest group.category[lang]
// bzw. term.term[lang]/term.explanation[lang].
export const GLOSSARY = [
  {
    category: { de: "Technische Signale", en: "Technical signals" },
    terms: [
      {
        term: { de: "RSI (Relative Strength Index)", en: "RSI (Relative Strength Index)" },
        explanation: {
          de: "Misst auf einer Skala von 0 bis 100, wie stark eine Coin in den letzten Tagen gestiegen oder gefallen ist. Werte über 70 gelten als \"überkauft\" (der Kurs ist evtl. zu schnell gestiegen, eine Korrektur wird wahrscheinlicher), Werte unter 30 als \"überverkauft\" (mögliche Erholung). Kein Kauf-/Verkaufssignal für sich allein, sondern ein Baustein im Gesamtbild.",
          en: "Measures on a scale of 0 to 100 how strongly a coin has risen or fallen in recent days. Values above 70 count as \"overbought\" (the price may have risen too fast, a correction becomes more likely), values below 30 as \"oversold\" (possible recovery). Not a buy/sell signal on its own, but one building block in the overall picture.",
        },
      },
      {
        term: { de: "MACD (Moving Average Convergence/Divergence)", en: "MACD (Moving Average Convergence/Divergence)" },
        explanation: {
          de: "Vergleicht zwei unterschiedlich schnell reagierende gleitende Durchschnitte des Kurses. Wenn der schnellere den langsameren von unten kreuzt, gilt das als Kaufsignal (das Momentum dreht nach oben), umgekehrt als Verkaufssignal. Reagiert schneller auf Trendwechsel als ein einzelner gleitender Durchschnitt.",
          en: "Compares two moving averages of the price that react at different speeds. When the faster one crosses the slower one from below, that counts as a buy signal (momentum turning upward), and the reverse as a sell signal. Reacts faster to trend changes than a single moving average.",
        },
      },
      {
        term: { de: "SMA (Simple Moving Average, gleitender Durchschnitt)", en: "SMA (Simple Moving Average)" },
        explanation: {
          de: "Der Durchschnittskurs der letzten X Tage. Die App vergleicht einen kurzfristigen (10 Tage) mit einem längerfristigen (30 Tage) Durchschnitt: liegt der kurzfristige über dem langfristigen, gilt der Trend als positiv (\"Golden Cross\"), darunter als negativ (\"Death Cross\").",
          en: "The average price over the last X days. The app compares a short-term (10-day) with a longer-term (30-day) average: if the short-term one is above the long-term one, the trend counts as positive (\"golden cross\"), below it as negative (\"death cross\").",
        },
      },
      {
        term: { de: "Handelsvolumen", en: "Trading volume" },
        explanation: {
          de: "Wie viel von einer Coin heute gehandelt wurde, verglichen mit dem Durchschnitt der letzten Tage. Ein deutlich erhöhtes Volumen bestätigt eine Kursbewegung stärker -- viele Marktteilnehmer sind gleichzeitig aktiv, statt dass der Kurs nur durch wenige große Orders bewegt wird.",
          en: "How much of a coin was traded today, compared to the average of recent days. A noticeably elevated volume confirms a price move more strongly -- many market participants are active at once, instead of the price being moved by just a few large orders.",
        },
      },
      {
        term: { de: "Whale-Signal (Top-Trader-Positionierung)", en: "Whale signal (top-trader positioning)" },
        explanation: {
          de: "Zeigt, ob die Trader mit den größten Positionen auf Binance Futures gerade stärker long (auf steigende Kurse setzend) oder short (auf fallende Kurse) positioniert sind als im eigenen 7-Tage-Schnitt. Eine Annäherung an \"was machen die Großen gerade\", ohne teure On-Chain-Analyse-Dienste.",
          en: "Shows whether the traders with the largest positions on Binance Futures are currently positioned more long (betting on rising prices) or short (falling prices) than their own 7-day average. An approximation of \"what are the big players doing right now\", without expensive on-chain analytics services.",
        },
      },
    ],
  },
  {
    category: { de: "Makro & Sentiment", en: "Macro & sentiment" },
    terms: [
      {
        term: { de: "Makro-Regime (Risk-on / Risk-off)", en: "Macro regime (risk-on / risk-off)" },
        explanation: {
          de: "Fasst fünf gesamtwirtschaftliche Faktoren (Geldmengenwachstum, Leitzins-Trend, Dollar-Stärke, Anleihe-Renditen, VIX) zu einer Einschätzung zusammen: \"Risk-on\" heißt, das Umfeld begünstigt tendenziell riskantere Anlagen wie Krypto, \"Risk-off\" das Gegenteil. Meist \"Neutral\", da diese Faktoren sich oft gegenseitig ausgleichen.",
          en: "Combines five macroeconomic factors (money-supply growth, interest-rate trend, dollar strength, bond yields, VIX) into one assessment: \"risk-on\" means the environment tends to favor riskier assets like crypto, \"risk-off\" the opposite. Usually \"neutral\", since these factors often cancel each other out.",
        },
      },
      {
        term: { de: "Fear & Greed Index", en: "Fear & Greed Index" },
        explanation: {
          de: "Ein von Dritten (alternative.me) berechneter Stimmungsindikator für den Kryptomarkt, 0 (extreme Angst) bis 100 (extreme Gier). Historisch oft ein Kontra-Indikator: extreme Angst fällt häufiger mit lokalen Tiefs zusammen, extreme Gier mit lokalen Hochs -- aber keine Garantie.",
          en: "A sentiment indicator for the crypto market calculated by a third party (alternative.me), ranging from 0 (extreme fear) to 100 (extreme greed). Historically often a contrarian indicator: extreme fear tends to coincide with local lows, extreme greed with local highs -- but no guarantee.",
        },
      },
      {
        term: { de: "VIX", en: "VIX" },
        explanation: {
          de: "Der \"Angst-Index\" der US-Aktienmärkte, misst die erwartete Schwankungsbreite des S&P 500. Hohe Werte (≥25) stehen für Nervosität an den Märkten, was sich oft auch negativ auf risikoreichere Anlagen wie Krypto auswirkt.",
          en: "The \"fear index\" of the US stock markets, measuring the expected volatility of the S&P 500. High values (≥25) signal nervousness in the markets, which often also negatively affects riskier assets like crypto.",
        },
      },
      {
        term: { de: "Liquidität (Orderbuch-Tiefe & Spread)", en: "Liquidity (order book depth & spread)" },
        explanation: {
          de: "Zeigt, wie teuer ein sofortiger Kauf/Verkauf gerade wäre. Die Geld-Brief-Spanne (Spread) ist der Unterschied zwischen dem besten Kauf- und Verkaufspreis -- je enger, desto günstiger ein sofortiger Handel. Die Tiefe zeigt, wie viel Volumen sich handeln lässt, ohne den Kurs spürbar zu bewegen. Reiner Marktkontext, kein Signal.",
          en: "Shows how expensive an immediate buy/sell would currently be. The bid-ask spread is the difference between the best buy and sell price -- the tighter it is, the cheaper an immediate trade. Depth shows how much volume can be traded without noticeably moving the price. Pure market context, not a signal.",
        },
      },
    ],
  },
  {
    category: { de: "Handel & Risiko", en: "Trading & risk" },
    terms: [
      {
        term: { de: "Long vs. Short", en: "Long vs. short" },
        explanation: {
          de: "Long = auf steigende Kurse setzen (klassisch: kaufen und später teurer verkaufen). Short = auf fallende Kurse setzen (eine Position wird eröffnet, die bei einem Kursrückgang Gewinn macht) -- technisch komplexer und riskanter, da Verluste bei Short-Positionen theoretisch unbegrenzt sein können.",
          en: "Long = betting on rising prices (classic: buy and later sell for more). Short = betting on falling prices (a position is opened that profits from a price decline) -- technically more complex and riskier, since losses on short positions can theoretically be unlimited.",
        },
      },
      {
        term: { de: "Hebel (Leverage)", en: "Leverage" },
        explanation: {
          de: "Mit geliehenem Kapital eine größere Position eingehen, als das eigene Kapital hergibt -- z.B. macht 3x Hebel eine 3% Kursbewegung zu einer ca. 9% Bewegung im eigenen Kapital, in beide Richtungen. Erhöht Gewinnchancen UND Verlustrisiko gleichermaßen, plus laufende Finanzierungskosten (Funding-Rate).",
          en: "Using borrowed capital to open a larger position than your own capital would allow -- e.g. 3x leverage turns a 3% price move into roughly a 9% move in your own capital, in either direction. Increases profit potential AND loss risk equally, plus ongoing financing costs (funding rate).",
        },
      },
      {
        term: { de: "Liquidation", en: "Liquidation" },
        explanation: {
          de: "Bei gehebelten Positionen: wenn sich der Kurs weit genug gegen die eigene Position bewegt, wird sie automatisch zwangsgeschlossen und die eingesetzte Margin ist verloren -- bei 5x Hebel reicht dafür bereits eine ca. 20%ige Gegenbewegung. Je höher der Hebel, desto näher die Liquidationsschwelle am Einstiegspreis.",
          en: "For leveraged positions: if the price moves far enough against your position, it gets automatically force-closed and the margin used is lost -- at 5x leverage, a roughly 20% adverse move is already enough. The higher the leverage, the closer the liquidation threshold is to the entry price.",
        },
      },
      {
        term: { de: "Stop-Loss", en: "Stop-loss" },
        explanation: {
          de: "Eine vorab festgelegte Kursschwelle, bei der eine Position automatisch geschlossen wird, um weitere Verluste zu begrenzen. Schützt vor großen Einzelverlusten, kann aber auch normale Kursschwankungen fälschlich als Trendwende interpretieren (\"ausgestoppt werden\", bevor der Kurs sich wieder erholt).",
          en: "A pre-set price threshold at which a position is automatically closed to limit further losses. Protects against large individual losses, but can also mistake normal price swings for a trend reversal (getting \"stopped out\" right before the price recovers).",
        },
      },
    ],
  },
  {
    category: { de: "Wie wir testen (Methodik)", en: "How we test (methodology)" },
    terms: [
      {
        term: { de: "Backtest", en: "Backtest" },
        explanation: {
          de: "Eine Simulation: \"Wie hätte diese Strategie historisch performt?\" -- die App spielt die Signal-Logik Tag für Tag über echte, vergangene Kursdaten durch, ohne dabei Wissen über die Zukunft zu nutzen (keine Vorausschau).",
          en: "A simulation: \"How would this strategy have performed historically?\" -- the app plays the signal logic through day by day over real, past price data, without ever using knowledge of the future (no look-ahead).",
        },
      },
      {
        term: { de: "Walk-Forward-Validierung", en: "Walk-forward validation" },
        explanation: {
          de: "Die strengste Testmethode dieser App: statt einmalig auf einem Zeitraum zu testen, wird der Zeitraum in mehrere Abschnitte geteilt. Jeder Abschnitt wird trainiert und dann auf dem NÄCHSTEN, noch nie gesehenen Abschnitt getestet -- simuliert, wie sich eine Strategie in der Praxis wiederholt neu bewähren müsste, statt nur einmal zufällig gut zu einem Zeitraum zu passen.",
          en: "This app's strictest test method: instead of testing once on a single period, the period is split into several segments. Each segment is trained on and then tested on the NEXT, never-before-seen segment -- simulating how a strategy would have to keep proving itself in practice, instead of just happening to fit one period well by chance.",
        },
      },
      {
        term: { de: "Out-of-Sample", en: "Out-of-sample" },
        explanation: {
          de: "Daten, die ein Test-Verfahren beim \"Training\" (Parameter-Suche) nie gesehen hat. Ein Ergebnis ist nur dann aussagekräftig, wenn es auch auf Out-of-Sample-Daten funktioniert -- sonst hat man nur die Vergangenheit \"auswendig gelernt\" (Overfitting), statt eine echte Kante gefunden.",
          en: "Data that a test procedure never saw during \"training\" (parameter search). A result is only meaningful if it also works on out-of-sample data -- otherwise you've just \"memorized\" the past (overfitting) instead of finding a real edge.",
        },
      },
      {
        term: { de: "Sharpe-Ratio", en: "Sharpe ratio" },
        explanation: {
          de: "Rendite im Verhältnis zum eingegangenen Risiko (Schwankungsbreite). Eine hohe Rendite mit wilden Ausschlägen nach oben und unten hat eine niedrigere Sharpe-Ratio als eine etwas kleinere, aber gleichmäßigere Rendite -- die App bewertet Strategien primär danach, nicht nach der reinen Rendite.",
          en: "Return relative to the risk taken (volatility). A high return with wild swings up and down has a lower Sharpe ratio than a somewhat smaller but steadier return -- the app evaluates strategies primarily by this, not by raw return alone.",
        },
      },
      {
        term: { de: "Max Drawdown", en: "Max drawdown" },
        explanation: {
          de: "Der größte Rückgang vom bisherigen Höchststand während eines Zeitraums. Zeigt, wie viel man im schlimmsten Moment (auf dem Papier) verloren hätte -- wichtig fürs eigene Risikoempfinden, unabhängig von der Endrendite.",
          en: "The largest decline from the previous peak during a period. Shows how much you would have lost (on paper) at the worst moment -- important for your own sense of risk, independent of the final return.",
        },
      },
    ],
  },
];
