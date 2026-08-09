export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { coin, rsi, macd, sma, volume, macro, feargreed, whale, bollinger, stochRsi, obv, candle, marubozu, price, change24h, tf } = req.body;

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

Antworte in maximal 3-4 Sätzen. Nenne konkret was die Daten bedeuten und ob eher kaufen, halten oder verkaufen sinnvoll wäre. Sei direkt und präzise.`;

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
