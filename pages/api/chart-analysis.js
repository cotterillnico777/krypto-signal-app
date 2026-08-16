import { requireActiveAccessApi } from "../../lib/auth/requireActiveAccessApi";
import { getRedis } from "../../lib/redis";

// Vercel Serverless Functions haben ein hartes, nicht konfigurierbares
// Body-Limit von ca. 4,5MB -- unabhängig von jeder Next.js-Konfiguration.
// pages/chart-analysis.js verkleinert JEDES Bild vor dem Senden auf Canvas
// (max. 1568px Kante, JPEG q0.85), reale Payloads liegen damit typischerweise
// weit unter 1MB. Dieses Limit ist nur ein defensives Auffangnetz gegen
// direkte API-Aufrufe, die die UI umgehen -- sollte im Normalbetrieb nie
// greifen.
export const config = { api: { bodyParser: { sizeLimit: "4mb" } } };

const DAILY_LIMIT = 5;
const MAX_BASE64_LENGTH = 4_000_000;
const ALLOWED_MEDIA_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

const MODE_INSTRUCTIONS = {
  daytrade:
    "Horizont: Day-Trade (Minuten bis Stunden). Fokussiere auf die letzten sichtbaren Kerzen, kurzfristiges Momentum und die unmittelbar nächsten Unterstützungs-/Widerstandszonen.",
  swing:
    "Horizont: Swing-Trade (Tage bis Wochen). Fokussiere auf den übergeordneten Trend über den gesamten sichtbaren Zeitraum und die größeren Unterstützungs-/Widerstandszonen, nicht auf einzelne Kerzen.",
};

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { imageBase64, mediaType, mode } = req.body || {};

  if (!imageBase64 || typeof imageBase64 !== "string") {
    return res.status(400).json({ error: "Kein Chart-Bild übermittelt." });
  }
  if (!ALLOWED_MEDIA_TYPES.includes(mediaType)) {
    return res.status(400).json({ error: "Nicht unterstütztes Bildformat (erlaubt: PNG, JPEG, WebP, GIF)." });
  }
  if (imageBase64.length > MAX_BASE64_LENGTH) {
    return res.status(400).json({ error: "Bild nach Verkleinerung immer noch zu groß -- bitte ein anderes Bild versuchen." });
  }
  const modeInstruction = MODE_INSTRUCTIONS[mode] || MODE_INSTRUCTIONS.swing;

  // Rate-Limit: Vision-Aufrufe verbrauchen deutlich mehr Tokens (Bild-Daten)
  // als die reinen Text-Prompts der bestehenden KI-Analyse-Buttons -- gleiches
  // Muster wie pages/api/trades/analyze.js (Redis-Zähler pro Nutzer/Tag,
  // wird übersprungen statt zu blockieren, falls Upstash-Env-Vars fehlen).
  const redis = getRedis();
  if (redis) {
    const today = new Date().toISOString().slice(0, 10);
    const key = `ratelimit:chartAnalysis:${ctx.user.id}:${today}`;
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, 24 * 60 * 60);
    if (count > DAILY_LIMIT) {
      return res.status(429).json({ error: "Tageslimit für Chart-Analysen erreicht. Versuch es morgen wieder." });
    }
  }

  // Bewusst KEINE Prozent-Wahrscheinlichkeiten -- ein Bild liefert keine
  // echte Statistik, eine erfundene Zahl würde nur mehr Präzision vortäuschen
  // als vorhanden ist. Stattdessen priorisierte Szenarien in Worten,
  // gleiches Prinzip wie die Klartext-Erklärung im Dashboard (explainSignal).
  const prompt = `Du bist ein erfahrener technischer Chart-Analyst. Dir wird ein Kurschart als Bild gezeigt. Beschreibe kurz, was du siehst (Trend, Unterstützung/Widerstand, erkennbare Muster wie Doppel-Top, Dreieck, Flagge, Momentum), und leite daraus priorisierte Szenarien ab.

${modeInstruction}

Wichtige Regeln für deine Antwort:
- Sprich NIEMALS in Prozent-Wahrscheinlichkeiten oder erfundenen Zahlen (keine "70%", keine "Wahrscheinlichkeit: X"). Nutze stattdessen sprachliche Abstufungen wie "deutlich wahrscheinlicher", "möglich, aber weniger wahrscheinlich" oder "nur relevant, falls X bricht".
- Nenne mindestens ein Hauptszenario und ein Alternativszenario, jeweils mit der Bedingung/dem Kurslevel, das es auslösen würde.
- Antworte auf Deutsch, maximal 6-8 Sätze, direkt und konkret, keine Allgemeinplätze.
- Schließe mit einem kurzen Satz, dass eine Bild-Analyse Grenzen hat (keine Kursdaten, kein Ersatz für eigene Prüfung, keine Anlageberatung).`;

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
        max_tokens: 600,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType, data: imageBase64 } },
              { type: "text", text: prompt },
            ],
          },
        ],
      }),
    });

    if (!response.ok) throw new Error(`Anthropic Fehler (${response.status})`);
    const data = await response.json();
    res.status(200).json({ analysis: data.content[0].text });
  } catch (err) {
    res.status(500).json({ error: err.message || "Chart-Analyse fehlgeschlagen." });
  }
}
