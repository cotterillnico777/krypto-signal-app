// Finanz-/Krypto-Schlagzeilen von etablierten, kostenlosen RSS-Feeds --
// bewusst KEINE bezahlte News-API (gleiches Kostenbewusstsein wie die
// übrigen Datenquellen dieser App: CoinGecko/FRED/Binance/alternative.me
// sind ebenfalls alle kostenlos, kein Key nötig). Die drei Quellen sind
// Standard-RSS-2.0-Feeds mit einfacher Struktur -- dafür reicht ein
// schlanker Regex-Parser statt eines XML-Parser-Pakets (gleiches Prinzip
// wie die handgeschriebenen Indikatoren in lib/signals.js statt einer
// TA-Bibliothek).
const FEEDS = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch" },
];

function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function extractTag(block, tag) {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  if (!m) return null;
  let val = m[1].trim();
  const cdata = val.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) val = cdata[1].trim();
  return decodeEntities(val.replace(/<[^>]+>/g, "").trim());
}

async function fetchFeed({ url, source }) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (compatible; FinlyraBot/1.0)" } });
    if (!res.ok) return [];
    const xml = await res.text();
    const items = xml.match(/<item[^>]*>[\s\S]*?<\/item>/gi) || [];
    return items
      .map((block) => {
        const title = extractTag(block, "title");
        const link = extractTag(block, "link");
        const pubDate = extractTag(block, "pubDate");
        if (!title || !link) return null;
        const publishedAt = pubDate ? new Date(pubDate) : null;
        return {
          title,
          link,
          source,
          publishedAt: publishedAt && !isNaN(publishedAt) ? publishedAt.toISOString() : null,
        };
      })
      .filter(Boolean)
      .slice(0, 10);
  } catch {
    // Ein einzelner ausgefallener Feed soll die anderen nicht mitreißen --
    // Dashboard zeigt dann einfach weniger/andere Schlagzeilen.
    return [];
  }
}

export async function fetchNews(limit = 15) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();
  all.sort((a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || ""));
  return all.slice(0, limit);
}

// Für die KI-Analyse (pages/api/analyze.js): Schlagzeilen, die den Coin-Namen
// oder das Symbol im Titel erwähnen, sind relevanter als der generische
// Nachrichten-Pool -- einfacher Substring-Match reicht für diesen Zweck,
// keine echte NLP-Entity-Erkennung nötig.
export function relevantHeadlines(items, coinName, coinSymbol, max = 3) {
  const needle1 = coinName.toLowerCase();
  const needle2 = coinSymbol.toLowerCase();
  const matches = items.filter((it) => {
    const t = it.title.toLowerCase();
    return t.includes(needle1) || new RegExp(`\\b${needle2}\\b`, "i").test(it.title);
  });
  const pool = matches.length > 0 ? matches : items;
  return pool.slice(0, max);
}
