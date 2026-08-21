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

// Deckt die vom Betreiber vorgegebenen 8 zulässigen Themen ab -- angewendet
// auf ALLE Feeds (nicht nur "institutional"), da v.a. der allgemeine
// MarketWatch-Feed unkuratierte Top-Stories liefert (Beobachtet: Artikel zu
// Hautkrebs, Costco-Medicare-Plänen, o.ä. -- branchenfremd fürs Dashboard).
// Jedes Tupel ist [Regex, Themen-Tag] -- die Reihenfolge bestimmt, welches
// Thema bei mehrfachem Treffer als Kategorie-Badge angezeigt wird. Bewusst
// als einzelne benannte Buckets statt einer einzigen Sammel-Regex, damit
// pro Artikel zusätzlich ein Themen-Tag fürs UI abfällt (siehe topic-Feld
// unten), nicht nur ein Ja/Nein-Filter.
const TOPIC_BUCKETS = [
  [/\b(crypto|bitcoin|ethereum|blockchain|token|altcoin|defi|web3)\b/i, "crypto"],
  [/\betfs?\b/i, "etf"],
  [/\b(federal reserve|\bfed\b|ecb|central bank|monetary policy|interest rate|rate (cut|hike))\b/i, "central_banks"],
  [/\b(inflation|\bcpi\b|jobs report|unemployment|labor market|payroll)\b/i, "inflation_jobs"],
  [/\b(yield|dollar|treasury)\b/i, "rates_dollar"],
  [/\b(regulation|regulatory|\bsec\b|compliance)\b/i, "regulation"],
  [/\b(stocks?|shares?|equit(y|ies)|bonds?)\b/i, "stocks_bonds"],
  [/\b(earnings|\bipo\b|merger|acquisition|\bgdp\b|economic|economy)\b/i, "corporate_macro"],
];

const MARKET_KEYWORDS = new RegExp(TOPIC_BUCKETS.map(([r]) => r.source).join("|"), "i");

function classifyTopic(title) {
  for (const [regex, topic] of TOPIC_BUCKETS) {
    if (regex.test(title)) return topic;
  }
  return null;
}

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
      .filter((it) => (category === "institutional" ? INSTITUTIONAL_KEYWORDS.test(it.title) : MARKET_KEYWORDS.test(it.title)))
      .map((it) => ({ ...it, topic: category === "institutional" ? "regulation" : classifyTopic(it.title) }))
      .slice(0, 10);
  } catch {
    // Ein einzelner ausgefallener Feed soll die anderen nicht mitreißen --
    // Dashboard zeigt dann einfach weniger/andere Schlagzeilen.
    return [];
  }
}

const byDateDesc = (a, b) => (b.publishedAt || "").localeCompare(a.publishedAt || "");

// Crypto-native/institutionelle Quellen gelten als "Kernrelevanz" (Stufe 0),
// der allgemeine Finanz-Feed (MarketWatch) als "breitere Relevanz" (Stufe
// 1) -- innerhalb jeder Stufe weiterhin nach Aktualität. Deckt "nach
// Relevanz UND Aktualität sortieren" ab, ohne ein eigenes Scoring-Modell zu
// brauchen (jeder Artikel hat den Themenfilter oben ohnehin schon bestanden,
// alle verbleibenden Artikel sind also per Definition relevant).
const SOURCE_TIER = { CoinDesk: 0, Cointelegraph: 0, "The Block": 0, SEC: 0 };
const byTierThenDate = (a, b) => {
  const tierDiff = (SOURCE_TIER[a.source] ?? 1) - (SOURCE_TIER[b.source] ?? 1);
  return tierDiff !== 0 ? tierDiff : byDateDesc(a, b);
};

// Gleicher Titel (normalisiert: klein geschrieben, Satzzeichen entfernt)
// von unterschiedlichen Quellen -- typisch bei syndizierten Meldungen --
// wird zu einem Eintrag zusammengefasst, erster Treffer (= FEEDS-
// Reihenfolge, crypto-native Quellen zuerst) gewinnt.
function normalizeTitle(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}
function dedupe(items) {
  const seen = new Set();
  const out = [];
  for (const it of items) {
    const key = normalizeTitle(it.title);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(it);
  }
  return out;
}

// Institutionelle Schlagzeilen (SEC) sind viel seltener als die allgemeinen
// Markt-Feeds -- würden sie einfach mit in den globalen, datumssortierten
// Pool gemischt und dann auf `limit` gekappt, verdrängen die hochfrequenten
// Markt-Feeds sie fast immer (in der Praxis: institutionalHeadlines() käme
// dann quasi nie zu Items, obwohl welche existieren -- live gegen die echten
// Feeds getestet und genau das beobachtet). Deshalb Markt- und
// institutionelle Items getrennt kappen, dann für die Anzeige wieder
// zusammen sortieren. Kein Backfill auf `limit` -- bestehen weniger Artikel
// den Relevanzfilter, werden bewusst weniger gezeigt statt mit
// Füllmaterial aufgestockt.
export async function fetchNews(limit = 15) {
  const results = await Promise.all(FEEDS.map(fetchFeed));
  const all = dedupe(results.flat());
  const market = all.filter((it) => it.category !== "institutional").sort(byTierThenDate);
  const institutional = all.filter((it) => it.category === "institutional").sort(byDateDesc);
  const combined = [...market.slice(0, limit), ...institutional.slice(0, 5)];
  combined.sort(byTierThenDate);
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
