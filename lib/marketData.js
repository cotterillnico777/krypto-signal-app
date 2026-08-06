// Zentrale Marktdaten-Fetches, genutzt von den API-Routen (Client-Aufrufe)
// und direkt vom Cron-Job (Server-zu-Server, kein HTTP-Umweg über sich selbst).

export const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
  { id: "ripple", symbol: "XRP", name: "XRP" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor" },
];

export const TIMEFRAMES = {
  "4H": { days: 2, interval: "hourly" },
  "1D": { days: 90, interval: "daily" },
  "1W": { days: 365, interval: "daily" },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function fetchCryptoData(tfKey = "1D") {
  const tf = TIMEFRAMES[tfKey] || TIMEFRAMES["1D"];
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = { "x-cg-demo-api-key": apiKey };

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

  return results;
}

// limit=24 reicht fürs Dashboard (aktuelles Regime). Der Backtest braucht mehr
// Vorlauf, um das YoY-Wachstum an jedem Simulationstag berechnen zu können.
export async function fetchMacroData(limit = 24) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY fehlt. Lege eine .env.local Datei an (siehe README.md).");

  const fetchSeries = async (seriesId) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FRED Fehler (${r.status}) für Serie ${seriesId}`);
    const data = await r.json();
    return data.observations
      .reverse()
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
      .filter((o) => !Number.isNaN(o.value));
  };

  const [m2, fedfunds] = await Promise.all([fetchSeries("M2SL"), fetchSeries("FEDFUNDS")]);
  return { m2, fedfunds };
}

export async function fetchFearGreedData(limit = 30) {
  const r = await fetch(`https://api.alternative.me/fng/?limit=${limit}`);
  if (!r.ok) throw new Error(`Fear & Greed Fehler (${r.status})`);
  const data = await r.json();
  const latest = data.data[0];
  const history = data.data.reverse().map((d) => ({
    value: parseInt(d.value),
    label: d.value_classification,
    date: new Date(d.timestamp * 1000).toLocaleDateString("de-DE"),
    ts: parseInt(d.timestamp) * 1000,
  }));
  return { value: parseInt(latest.value), label: latest.value_classification, history };
}

// Rohe Kurs-/Volumenreihe mit Zeitstempeln für den Backtest (im Unterschied
// zu fetchCryptoData, das für das Dashboard nur die Werte behält).
export async function fetchHistoricalSeries(coinId, days = 365) {
  const apiKey = process.env.COINGECKO_API_KEY;
  const headers = { "x-cg-demo-api-key": apiKey };
  const r = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=daily`,
    { headers }
  );
  if (!r.ok) throw new Error(`CoinGecko Fehler (${r.status})`);
  const data = await r.json();
  return {
    prices: data.prices.map(([t, v]) => ({ t, v })),
    volumes: data.total_volumes.map(([t, v]) => ({ t, v })),
  };
}
