// Zentrale Marktdaten-Fetches, genutzt von den API-Routen (Client-Aufrufe)
// und direkt vom Cron-Job (Server-zu-Server, kein HTTP-Umweg über sich selbst).
//
// Kursdaten kommen von Binances öffentlicher API (kein Key nötig, großzügige
// Rate-Limits, volle Tages-Historie seit Listing) statt CoinGecko – dadurch
// kann der Backtest mehrere Jahre zurückschauen statt nur ~1 Jahr.

export const COINS = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin", pair: "BTCUSDT" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum", pair: "ETHUSDT" },
  { id: "solana", symbol: "SOL", name: "Solana", pair: "SOLUSDT" },
  { id: "ripple", symbol: "XRP", name: "XRP", pair: "XRPUSDT" },
  { id: "bittensor", symbol: "TAO", name: "Bittensor", pair: "TAOUSDT" },
];

export const TIMEFRAMES = {
  "4H": { interval: "1h", limit: 48 },
  "1D": { interval: "1d", limit: 90 },
  "1W": { interval: "1d", limit: 365 },
};

export async function fetchCryptoData(tfKey = "1D") {
  const tf = TIMEFRAMES[tfKey] || TIMEFRAMES["1D"];

  const symbolsParam = encodeURIComponent(JSON.stringify(COINS.map((c) => c.pair)));
  const tickerRes = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);
  if (!tickerRes.ok) throw new Error(`Binance Preis-Fehler (${tickerRes.status})`);
  const tickers = await tickerRes.json();
  const tickerByPair = Object.fromEntries(tickers.map((t) => [t.symbol, t]));

  const results = await Promise.all(
    COINS.map(async (coin) => {
      const klinesRes = await fetch(
        `https://api.binance.com/api/v3/klines?symbol=${coin.pair}&interval=${tf.interval}&limit=${tf.limit}`
      );
      if (!klinesRes.ok) throw new Error(`Binance Fehler für ${coin.name} (${klinesRes.status})`);
      const klines = await klinesRes.json();
      const ticker = tickerByPair[coin.pair];
      return {
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: parseFloat(ticker.lastPrice),
        change24h: parseFloat(ticker.priceChangePercent),
        prices: klines.map((k) => parseFloat(k[4])),
        volumes: klines.map((k) => parseFloat(k[7])),
      };
    })
  );

  return results;
}

// M2SL/FEDFUNDS sind monatlich (monthlyLimit=24 -> 2 Jahre reicht fürs
// YoY/Trend-Fenster). DTWEXBGS/DGS10/VIXCLS sind täglich (Handelstage, keine
// Wochenenden/Feiertage) – dailyLimit=90 deckt fürs Dashboard komfortabel das
// 3-Monats-Trendfenster ab. Der Backtest übergibt für beide deutlich größere
// Limits, damit an jedem Simulationstag genug Vorlauf vorhanden ist.
export async function fetchMacroData(monthlyLimit = 24, dailyLimit = 90) {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) throw new Error("FRED_API_KEY fehlt. Lege eine .env.local Datei an (siehe README.md).");

  const fetchSeries = async (seriesId, limit) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=${limit}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(`FRED Fehler (${r.status}) für Serie ${seriesId}`);
    const data = await r.json();
    return data.observations
      .reverse()
      .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
      .filter((o) => !Number.isNaN(o.value));
  };

  const [m2, fedfunds, dxy, yield10y, vix] = await Promise.all([
    fetchSeries("M2SL", monthlyLimit), // M2-Geldmenge (Mrd. USD, monatlich)
    fetchSeries("FEDFUNDS", monthlyLimit), // Effektiver Leitzins (%, monatlich)
    fetchSeries("DTWEXBGS", dailyLimit), // Handelsgewichteter US-Dollar-Index (täglich)
    fetchSeries("DGS10", dailyLimit), // 10-jährige US-Staatsanleihe-Rendite (%, täglich)
    fetchSeries("VIXCLS", dailyLimit), // CBOE Volatility Index (täglich)
  ]);
  return { m2, fedfunds, dxy, yield10y, vix };
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

const BINANCE_KLINES_MAX = 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Rohe Kurs-/Tief-/Volumenreihe mit Zeitstempeln für den Backtest (im
// Unterschied zu fetchCryptoData, das für das Dashboard nur die aktuellen
// Werte behält). Paginiert über mehrere Binance-Requests, falls die
// angefragte Zeitspanne das 1000-Kerzen-Limit pro Request überschreitet.
export async function fetchHistoricalSeries(coinId, days = 365) {
  const coin = COINS.find((c) => c.id === coinId);
  if (!coin) throw new Error("Unbekannte Coin.");

  const endTime = Date.now();
  let cursor = endTime - days * DAY_MS;
  let klines = [];

  while (cursor < endTime) {
    const r = await fetch(
      `https://api.binance.com/api/v3/klines?symbol=${coin.pair}&interval=1d&startTime=${cursor}&limit=${BINANCE_KLINES_MAX}`
    );
    if (!r.ok) throw new Error(`Binance Fehler (${r.status})`);
    const batch = await r.json();
    if (!batch.length) break;
    klines = klines.concat(batch);
    if (batch.length < BINANCE_KLINES_MAX) break;
    cursor = batch[batch.length - 1][0] + DAY_MS;
  }

  return {
    prices: klines.map((k) => ({ t: k[0], v: parseFloat(k[4]) })),
    lows: klines.map((k) => ({ t: k[0], v: parseFloat(k[3]) })),
    volumes: klines.map((k) => ({ t: k[0], v: parseFloat(k[7]) })),
  };
}
