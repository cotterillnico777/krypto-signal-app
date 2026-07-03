const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", pair: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", pair: "ETHUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", pair: "SOLUSDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", pair: "XRPUSDT" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor", pair: "TAOUSDT" },
];

const TIMEFRAMES = {
  "4H":  { interval: "4h", limit: 120 },
  "1D":  { interval: "1d", limit: 90 },
  "1W":  { interval: "1w", limit: 52 },
};

export default async function handler(req, res) {
  const tf = TIMEFRAMES[req.query.tf] || TIMEFRAMES["1D"];
  try {
    const results = await Promise.all(
      COINS.map(async (coin) => {
        const [tickerRes, klinesRes] = await Promise.all([
          fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${coin.pair}`),
          fetch(`https://api.binance.com/api/v3/klines?symbol=${coin.pair}&interval=${tf.interval}&limit=${tf.limit}`),
        ]);
        if (!tickerRes.ok) throw new Error(`Binance Fehler für ${coin.name} (${tickerRes.status})`);
        if (!klinesRes.ok) throw new Error(`Binance Chart-Fehler für ${coin.name} (${klinesRes.status})`);
        const ticker = await tickerRes.json();
        const klines = await klinesRes.json();
        return {
          id: coin.id,
          symbol: coin.symbol,
          name: coin.name,
          price: parseFloat(ticker.lastPrice),
          change24h: parseFloat(ticker.priceChangePercent),
          prices: klines.map((k) => parseFloat(k[4])),
          volumes: klines.map((k) => parseFloat(k[5])),
        };
      })
    );
    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler" });
  }
}
