// Finanz-/Krypto-Schlagzeilen von etablierten, kostenlosen RSS-Feeds --
// bewusst KEINE bezahlte News-API (gleiches Kostenbewusstsein wie die
// übrigen Datenquellen dieser App: CoinGecko/FRED/Binance/alternative.me
// sind ebenfalls alle kostenlos, kein Key nötig). Die drei Quellen sind
// Standard-RSS-2.0-Feeds mit einfacher Struktur -- dafür reicht ein
// schlanker Regex-Parser statt eines XML-Parser-Pakets (gleiches Prinzip
// wie die handgeschriebenen Indikatoren in lib/signals.js statt einer
// TA-Bibliothek).
const FEEDS = [
  { url: "https://www.coindesk.com/arc/outboundfeeds/rss/", source: "CoinDesk", category: "market" },
  { url: "https://cointelegraph.com/rss", source: "Cointelegraph", category: "market" },
  { url: "https://feeds.content.dowjones.io/public/rss/mw_topstories", source: "MarketWatch", category: "market" },
  // Börsen-/institutionelle Flows (Listings, ETF-Flows, Regulatorik) --
  // crypto-nativ, kein Zusatzfilter nötig (im Gegensatz zu SEC unten).
  { url: "https://www.theblock.co/rss.xml", source: "The Block", category: "market" },
  // Alle SEC-Pressemitteilungen, nicht nur krypto-bezogene -- deshalb unten
  // per INSTITUTIONAL_KEYWORDS auf Krypto-Relevanz gefiltert, sonst zu viel
  // branchenfremdes Rauschen (Fraud-Fälle, unrelated Enforcement etc.).
  { url: "https://www.sec.gov/news/pressreleases.rss", source: "SEC", category: "institutional" },
];

const INSTITUTIONAL_KEYWORDS = /bitcoin|crypto|digital asset|blockchain|\betf\b/i;

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

async function fetchFeed({ url, source, category }) {
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
          category,
          publishedAt: publishedAt && !isNaN(publishedAt) ? publishedAt.toISOString() : null,
        };
      })
      .filter(Boolean)
      .filter((it) => category !== "institutional" || INSTITUTIONAL_KEYWORDS.test(it.title))
      .slice(0, 10);
  } catch {
    // Ein einzelner ausgefallener Feed soll die anderen nicht mitreißen --
    // Dashboard zeigt dann einfach weniger/andere Schlagzeilen.
    return [];
  }
}

const byDateDesc = (a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "");

// Institutionelle Schlagzeilen (SEC) sind viel seltener als die allgemeinen
// Markt-Feeds -- würden sie einfach mit in den globalen, datumssortierten
// Pool gemischt und dann auf `limit` gekappt, verdrängen die hochfrequenten
// Markt-Feeds sie fast immer (in der Praxis: institutionalHeadlines() käme
// dann quasi nie zu Items, obwohl welche existieren -- live gegen die echten
// Feeds getestet und genau das beobachtet). Deshalb Markt- und
// institutionelle Items getrennt kappen, dann für die Anzeige wieder
// zusammen nach Datum sortieren.
export async function fetchNews(limit = 15) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = results.flat();
  const market = all.filter((it) => it.category !== "institutional").sort(byDateDesc);
  const institutional = all.filter((it) => it.category === "institutional").sort(byDateDesc);
  const combined = [...market.slice(0, limit), ...institutional.slice(0, 5)];
  combined.sort(byDateDesc);
  return combined.slice(0, limit + 5);
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

// Institutionelle/regulatorische Schlagzeilen (SEC) -- anders als
// relevantHeadlines() NICHT auf einen einzelnen Coin gefiltert, da ETF-/
// Regulatorik-Entscheidungen i.d.R. marktweit relevant sind, nicht
// coin-spezifisch.
export function institutionalHeadlines(items, max = 3) {
  return items.filter((it) => it.category === "institutional").slice(0, max);
}
