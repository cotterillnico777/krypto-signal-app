// Ausführlichere Erklärungen als die Dashboard-Tooltips erlauben -- Pull-
// Faktor #3 aus der Retail-/Neuling-Roadmap: eine eigene, öffentliche
// Lern-Seite (pages/glossar.js) statt nur einzeiliger title-Attribute.
// Statische Daten, kein Overengineering, gleiches Muster wie
// lib/validationHistory.js/lib/paramTips.js -- Logik/Styling lebt in der
// Seite, hier nur Inhalt.
export const GLOSSARY = [
  {
    category: "Technische Signale",
    terms: [
      {
        term: "RSI (Relative Strength Index)",
        explanation:
          "Misst auf einer Skala von 0 bis 100, wie stark eine Coin in den letzten Tagen gestiegen oder gefallen ist. Werte über 70 gelten als \"überkauft\" (der Kurs ist evtl. zu schnell gestiegen, eine Korrektur wird wahrscheinlicher), Werte unter 30 als \"überverkauft\" (mögliche Erholung). Kein Kauf-/Verkaufssignal für sich allein, sondern ein Baustein im Gesamtbild.",
      },
      {
        term: "MACD (Moving Average Convergence/Divergence)",
        explanation:
          "Vergleicht zwei unterschiedlich schnell reagierende gleitende Durchschnitte des Kurses. Wenn der schnellere den langsameren von unten kreuzt, gilt das als Kaufsignal (das Momentum dreht nach oben), umgekehrt als Verkaufssignal. Reagiert schneller auf Trendwechsel als ein einzelner gleitender Durchschnitt.",
      },
      {
        term: "SMA (Simple Moving Average, gleitender Durchschnitt)",
        explanation:
          "Der Durchschnittskurs der letzten X Tage. Die App vergleicht einen kurzfristigen (10 Tage) mit einem längerfristigen (30 Tage) Durchschnitt: liegt der kurzfristige über dem langfristigen, gilt der Trend als positiv (\"Golden Cross\"), darunter als negativ (\"Death Cross\").",
      },
      {
        term: "Handelsvolumen",
        explanation:
          "Wie viel von einer Coin heute gehandelt wurde, verglichen mit dem Durchschnitt der letzten Tage. Ein deutlich erhöhtes Volumen bestätigt eine Kursbewegung stärker -- viele Marktteilnehmer sind gleichzeitig aktiv, statt dass der Kurs nur durch wenige große Orders bewegt wird.",
      },
      {
        term: "Whale-Signal (Top-Trader-Positionierung)",
        explanation:
          "Zeigt, ob die Trader mit den größten Positionen auf Binance Futures gerade stärker long (auf steigende Kurse setzend) oder short (auf fallende Kurse) positioniert sind als im eigenen 7-Tage-Schnitt. Eine Annäherung an \"was machen die Großen gerade\", ohne teure On-Chain-Analyse-Dienste.",
      },
    ],
  },
  {
    category: "Makro & Sentiment",
    terms: [
      {
        term: "Makro-Regime (Risk-on / Risk-off)",
        explanation:
          "Fasst fünf gesamtwirtschaftliche Faktoren (Geldmengenwachstum, Leitzins-Trend, Dollar-Stärke, Anleihe-Renditen, VIX) zu einer Einschätzung zusammen: \"Risk-on\" heißt, das Umfeld begünstigt tendenziell riskantere Anlagen wie Krypto, \"Risk-off\" das Gegenteil. Meist \"Neutral\", da diese Faktoren sich oft gegenseitig ausgleichen.",
      },
      {
        term: "Fear & Greed Index",
        explanation:
          "Ein von Dritten (alternative.me) berechneter Stimmungsindikator für den Kryptomarkt, 0 (extreme Angst) bis 100 (extreme Gier). Historisch oft ein Kontra-Indikator: extreme Angst fällt häufiger mit lokalen Tiefs zusammen, extreme Gier mit lokalen Hochs -- aber keine Garantie.",
      },
      {
        term: "VIX",
        explanation:
          "Der \"Angst-Index\" der US-Aktienmärkte, misst die erwartete Schwankungsbreite des S&P 500. Hohe Werte (≥25) stehen für Nervosität an den Märkten, was sich oft auch negativ auf risikoreichere Anlagen wie Krypto auswirkt.",
      },
      {
        term: "Liquidität (Orderbuch-Tiefe & Spread)",
        explanation:
          "Zeigt, wie teuer ein sofortiger Kauf/Verkauf gerade wäre. Die Geld-Brief-Spanne (Spread) ist der Unterschied zwischen dem besten Kauf- und Verkaufspreis -- je enger, desto günstiger ein sofortiger Handel. Die Tiefe zeigt, wie viel Volumen sich handeln lässt, ohne den Kurs spürbar zu bewegen. Reiner Marktkontext, kein Signal.",
      },
    ],
  },
  {
    category: "Handel & Risiko",
    terms: [
      {
        term: "Long vs. Short",
        explanation:
          "Long = auf steigende Kurse setzen (klassisch: kaufen und später teurer verkaufen). Short = auf fallende Kurse setzen (eine Position wird eröffnet, die bei einem Kursrückgang Gewinn macht) -- technisch komplexer und riskanter, da Verluste bei Short-Positionen theoretisch unbegrenzt sein können.",
      },
      {
        term: "Hebel (Leverage)",
        explanation:
          "Mit geliehenem Kapital eine größere Position eingehen, als das eigene Kapital hergibt -- z.B. macht 3x Hebel eine 3% Kursbewegung zu einer ca. 9% Bewegung im eigenen Kapital, in beide Richtungen. Erhöht Gewinnchancen UND Verlustrisiko gleichermaßen, plus laufende Finanzierungskosten (Funding-Rate).",
      },
      {
        term: "Liquidation",
        explanation:
          "Bei gehebelten Positionen: wenn sich der Kurs weit genug gegen die eigene Position bewegt, wird sie automatisch zwangsgeschlossen und die eingesetzte Margin ist verloren -- bei 5x Hebel reicht dafür bereits eine ca. 20%ige Gegenbewegung. Je höher der Hebel, desto näher die Liquidationsschwelle am Einstiegspreis.",
      },
      {
        term: "Stop-Loss",
        explanation:
          "Eine vorab festgelegte Kursschwelle, bei der eine Position automatisch geschlossen wird, um weitere Verluste zu begrenzen. Schützt vor großen Einzelverlusten, kann aber auch normale Kursschwankungen fälschlich als Trendwende interpretieren (\"ausgestoppt werden\", bevor der Kurs sich wieder erholt).",
      },
    ],
  },
  {
    category: "Wie wir testen (Methodik)",
    terms: [
      {
        term: "Backtest",
        explanation:
          "Eine Simulation: \"Wie hätte diese Strategie historisch performt?\" -- die App spielt die Signal-Logik Tag für Tag über echte, vergangene Kursdaten durch, ohne dabei Wissen über die Zukunft zu nutzen (keine Vorausschau).",
      },
      {
        term: "Walk-Forward-Validierung",
        explanation:
          "Die strengste Testmethode dieser App: statt einmalig auf einem Zeitraum zu testen, wird der Zeitraum in mehrere Abschnitte geteilt. Jeder Abschnitt wird trainiert und dann auf dem NÄCHSTEN, noch nie gesehenen Abschnitt getestet -- simuliert, wie sich eine Strategie in der Praxis wiederholt neu bewähren müsste, statt nur einmal zufällig gut zu einem Zeitraum zu passen.",
      },
      {
        term: "Out-of-Sample",
        explanation:
          "Daten, die ein Test-Verfahren beim \"Training\" (Parameter-Suche) nie gesehen hat. Ein Ergebnis ist nur dann aussagekräftig, wenn es auch auf Out-of-Sample-Daten funktioniert -- sonst hat man nur die Vergangenheit \"auswendig gelernt\" (Overfitting), statt eine echte Kante gefunden.",
      },
      {
        term: "Sharpe-Ratio",
        explanation:
          "Rendite im Verhältnis zum eingegangenen Risiko (Schwankungsbreite). Eine hohe Rendite mit wilden Ausschlägen nach oben und unten hat eine niedrigere Sharpe-Ratio als eine etwas kleinere, aber gleichmäßigere Rendite -- die App bewertet Strategien primär danach, nicht nach der reinen Rendite.",
      },
      {
        term: "Max Drawdown",
        explanation:
          "Der größte Rückgang vom bisherigen Höchststand während eines Zeitraums. Zeigt, wie viel man im schlimmsten Moment (auf dem Papier) verloren hätte -- wichtig fürs eigene Risikoempfinden, unabhängig von der Endrendite.",
      },
    ],
  },
];
