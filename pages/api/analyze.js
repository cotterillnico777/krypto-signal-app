import { requireActiveAccessApi } from "../../lib/auth/requireActiveAccessApi";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { coin, rsi, macd, sma, volume, macro, feargreed, whale, bollinger, stochRsi, obv, candle, marubozu, price, change24h, tf, headlines, cycle, institutionalHeadlines } = req.body;

  // headlines: optional Array von {title, source} -- vom Client aus dem
  // News-Pool (lib/news.js relevantHeadlines) vorgefiltert auf Schlagzeilen,
  // die den Coin-Namen erwähnen. Rein zusätzlicher Kontext für die KI, kein
  // Signal-Input -- ändert nichts an combineSignal()/explainSignal().
  const newsBlock =
    Array.isArray(headlines) && headlines.length > 0
      ? `\nAktuelle Schlagzeilen:\n${headlines.map((h) => `- ${h.title} (${h.source})`).join("\n")}\n`
      : "";

  // cycle: optionales Rohdaten-Objekt aus lib/cycleAnalysis.js (vom Client
  // via /api/cycle geladen). Enthält nur Zahlen, keine fertigen Sätze (siehe
  // lib/cycleAnalysis.js-Kommentar) -- der deutsche Satz wird hier gebaut,
  // da dieser Prompt ausschließlich serverseitig läuft.
  const cycleBlock = !cycle
    ? ""
    : !cycle.hasEnoughHistory
    ? `\nZyklus-Kontext: Nicht genug Kurshistorie für einen Zyklusvergleich bei diesem Coin.\n`
    : `\nZyklus-Kontext:\n- Vorheriger Zyklus: ATH $${cycle.previousCycle?.athPrice ?? "n/a"} am ${cycle.previousCycle?.athDate ?? "n/a"}, Tief $${cycle.previousCycle?.bottomPrice ?? "n/a"} nach ${cycle.previousCycle?.daysAthToBottom ?? "n/a"} Tagen.\n- Aktueller Zyklus: ATH $${cycle.currentCycle.athPrice} am ${cycle.currentCycle.athDate}, aktuell Tag ${cycle.currentCycle.daysSinceAth} seit diesem ATH, Drawdown ${cycle.currentCycle.drawdownFromAthPct?.toFixed(0)}% vom ATH.\n${cycle.cycleTimeComparison ? `- Zeitvergleich: Im vorherigen Zyklus dauerte es ${cycle.cycleTimeComparison.daysAthToBottomPreviousCycle} Tage vom ATH bis zum Tief, aktuell sind seit dem ATH ${cycle.cycleTimeComparison.daysSinceCurrentAth} Tage vergangen (${cycle.cycleTimeComparison.pctOfPreviousDuration ?? "n/a"}% dieser vorherigen Dauer).\n` : ""}- Bodenbildung: ${cycle.bottomFormation?.score == null ? "nicht anwendbar (kein signifikanter Drawdown)" : `${cycle.bottomFormation.score}/${cycle.bottomFormation.maxScore} Anzeichen`}\n- Trendregime (wöchentlich): ${cycle.trendRegime?.label ?? "n/a"}\n`;

  const institutionalBlock =
    Array.isArray(institutionalHeadlines) && institutionalHeadlines.length > 0
      ? `\nInstitutionelle/regulatorische Schlagzeilen:\n${institutionalHeadlines.map((h) => `- ${h.title} (${h.source})`).join("\n")}\n`
      : "";

  const prompt = `Du bist ein erfahrener Krypto-Analyst. Analysiere folgende Daten für ${coin} (Timeframe: ${tf}) und gib eine klare, kurze Einschätzung auf Deutsch:

Aktueller Preis: $${price} (${change24h > 0 ? "+" : ""}${parseFloat(change24h).toFixed(1)}% 24h)
RSI: ${rsi ?? "n/a"}
MACD: ${macd}
SMA-Signal: ${sma}
Volumen: ${volume}
Bollinger Bänder: ${bollinger ?? "n/a"}
Stochastic RSI: ${stochRsi ?? "n/a"}
On-Balance-Volume (Trend vs. eigene SMA20): ${obv ?? "n/a"}
Starke Kerze (Tagesspanne deutlich über Durchschnitt + eindeutiger Schluss nahe Hoch/Tief): ${candle ?? "n/a"}
Marubozu (Kerzenkörper macht fast die komplette Spanne aus, kaum Dochte): ${marubozu ?? "n/a"}
Fear & Greed Index: ${feargreed}
Makro-Regime: ${macro}
Whale-Positionierung (Top-Trader Long/Short auf Binance-Futures, coin-relativ zum 7-Tage-Durchschnitt): ${whale ?? "n/a"}
${newsBlock}${cycleBlock}${institutionalBlock}
Antworte in maximal 3-4 Sätzen. Nenne konkret was die Daten bedeuten und ob eher kaufen, halten oder verkaufen sinnvoll wäre. Falls Schlagzeilen oben stehen, beziehe kurz mit ein, ob sie zur technischen Einschätzung passen oder ihr widersprechen. Falls ein Zyklus-Kontext oben steht, ordne kurz ein, ob der aktuelle Zeitpunkt im Zyklus (Tage seit ATH, Bodenbildung, Trendregime) zur technischen Einschätzung passt -- nutze ihn aber NICHT als eigenständiges Kauf-/Verkaufssignal, sondern nur als zeitlichen Kontext. Sei direkt und präzise.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic Fehler (${response.status})`);
    const data = await response.json();
    res.status(200).json({ analysis: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
