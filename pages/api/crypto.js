const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor" },
];

const TIMEFRAMES = {
  "4H": { days: 2, interval: "hourly" },
  "1D": { days: 90, interval: "daily" },
  "1W": { days: 365, interval: "daily" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  const tf = TIMEFRAMES[req.query.tf] || TIMEFRAMES["1D"];
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = { "x-cg-demo-api-key": apiKey };

  try {
    const ids = COINS.map((c) => c.id).join(",");
    const priceRes = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
      { headers }
    );
    if (!priceRes.ok) throw new Error(`CoinGecko Preis-Fehler (${priceRes.status})`);
    const priceData = await priceRes.json();

    const results = [];
    for (const coin of COINS) {
      await sleep(1500);
      const chartRes = await fetch(
        `https://api.coingecko.com/api/v3/coins/${coin.id}/market_chart?vs_currency=usd&days=${tf.days}&interval=${tf.interval}`,
        { headers }
      );
      if (!chartRes.ok) throw new Error(`CoinGecko Fehler für ${coin.name} (${chartRes.status})`);
      const chartData = await chartRes.json();
      results.push({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: priceData[coin.id].usd,
        change24h: priceData[coin.id].usd_24h_change,
        prices: chartData.prices.map((p) => p[1]),
        volumes: chartData.total_volumes.map((v) => v[1]),
      });
    }

    res.status(200).json(results);
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler" });
  }
}
