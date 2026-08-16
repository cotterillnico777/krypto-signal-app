import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

const MAX_FILE_BYTES = 20 * 1024 * 1024;
// Anthropics eigene Empfehlung für die längste Bildkante (mehr bringt keine
// bessere Analysequalität, nur mehr Tokens). Wichtiger hier: Vercels
// Serverless-Functions haben ein hartes, nicht konfigurierbares Body-Limit
// von ca. 4,5MB -- ein unveränderter Screenshot (v.a. von Retina-Displays,
// oft 3-8MB als PNG) würde das reißen und mit einem kryptischen
// "FUNCTION_PAYLOAD_TOO_LARGE" scheitern, das obendrein kein JSON ist und
// den bisherigen res.json()-Aufruf mit "Unexpected token" crashen ließ.
// Deshalb wird JEDES Bild vor dem Upload auf Canvas verkleinert und als
// JPEG neu kodiert -- ein typischer Chart-Screenshot landet danach bei
// wenigen Hundert KB, weit unter jedem Limit.
const MAX_DIMENSION = 1568;
const JPEG_QUALITY = 0.85;

function resizeImageToBase64(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        const scale = MAX_DIMENSION / Math.max(width, height);
        width = Math.round(width * scale);
        height = Math.round(height * scale);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(objectUrl);
          if (!blob) { reject(new Error("Bild konnte nicht verarbeitet werden.")); return; }
          const reader = new FileReader();
          reader.onload = () => resolve({ base64: reader.result.split(",")[1], mediaType: "image/jpeg" });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Bild konnte nicht gelesen werden.")); };
    img.src = objectUrl;
  });
}

export default function ChartAnalysis({ user, access }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [mode, setMode] = useState("swing");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  function onFileChange(e) {
    const f = e.target.files?.[0];
    setResult(null);
    setError(null);
    if (!f) {
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setError("Bitte ein Bild hochladen (PNG, JPEG, WebP oder GIF).");
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError("Bild zu groß (max. 20MB).");
      return;
    }
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function analyze() {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { base64, mediaType } = await resizeImageToBase64(file);
      const res = await fetch("/api/chart-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, mediaType, mode }),
      });
      // Manche Fehler (z.B. Vercels eigenes "Payload zu groß") kommen als
      // Klartext statt JSON zurück -- res.json() würde daran mit einer
      // verwirrenden "Unexpected token"-Meldung scheitern. Content-Type
      // vorher prüfen und in dem Fall eine verständliche Meldung zeigen.
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error(res.status === 413 ? "Bild zu groß für die Analyse -- bitte ein kleineres Bild versuchen." : `Unerwarteter Serverfehler (${res.status}).`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.analysis);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <AppHeader
        title="Chart-Analyse"
        subtitle="Chart-Bild hochladen, Claude beschreibt Szenarien -- in Worten, nicht in erfundenen Prozentzahlen"
        active="chart-analysis"
        user={user}
        access={access}
      />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">Chart hochladen</p>
        <label className="field" style={{ marginBottom: "1rem" }}>
          Bild (PNG, JPEG, WebP, GIF -- max. 20MB, wird vor dem Hochladen automatisch verkleinert)
          <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFileChange} />
        </label>

        {previewUrl && (
          <img
            src={previewUrl}
            alt="Chart-Vorschau"
            style={{ maxWidth: "100%", maxHeight: 320, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "1rem", display: "block" }}
          />
        )}

        <div className="field" style={{ marginBottom: "1rem" }}>
          Horizont
          <div className="tabs">
            <button type="button" className={mode === "daytrade" ? "active" : ""} onClick={() => setMode("daytrade")}>Day-Trade</button>
            <button type="button" className={mode === "swing" ? "active" : ""} onClick={() => setMode("swing")}>Swing-Trade</button>
          </div>
        </div>

        <button className="ai-btn" onClick={analyze} disabled={!file || loading}>
          {loading ? "Analysiere…" : "🔍 Chart analysieren"}
        </button>
        <p className="note" style={{ marginTop: 8 }}>Max. 5 Analysen pro Tag.</p>

        {error && <div className="error-box" style={{ marginTop: 10 }}>Fehler: {error}</div>}
        {result && <div className="ai-result">{result}</div>}
      </div>

      <div className="disclaimer">
        Reine Bild-Erkennung durch Claude -- keine echten Kursdaten, keine statistische Wahrscheinlichkeit, kein Ersatz für eigene Prüfung. Priorisierte Szenarien werden bewusst in Worten statt in Prozentzahlen ausgedrückt, um keine Genauigkeit vorzutäuschen, die eine Bild-Analyse nicht liefern kann. Keine Anlageberatung.
      </div>
    </div>
  );
}
