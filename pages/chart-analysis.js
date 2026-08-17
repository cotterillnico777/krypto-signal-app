import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";
import { useLanguage } from "../lib/i18n";

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

function resizeImageToBase64(file, t) {
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
          if (!blob) { reject(new Error(t("chartAnalysis.errorProcessImage"))); return; }
          const reader = new FileReader();
          reader.onload = () => resolve({ base64: reader.result.split(",")[1], mediaType: "image/jpeg" });
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        "image/jpeg",
        JPEG_QUALITY
      );
    };
    img.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error(t("chartAnalysis.errorReadImage"))); };
    img.src = objectUrl;
  });
}

export default function ChartAnalysis({ user, access }) {
  const { t } = useLanguage();
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
      setError(t("chartAnalysis.errorNotImage"));
      return;
    }
    if (f.size > MAX_FILE_BYTES) {
      setError(t("chartAnalysis.errorTooLarge"));
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
      const { base64, mediaType } = await resizeImageToBase64(file, t);
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
        throw new Error(res.status === 413 ? t("chartAnalysis.errorTooLargeAnalysis") : t("chartAnalysis.errorUnexpected", { status: res.status }));
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
        title={t("chartAnalysis.title")}
        subtitle={t("chartAnalysis.subtitle")}
        active="chart-analysis"
        user={user}
        access={access}
      />

      <div className="card" style={{ marginBottom: "1.5rem" }}>
        <p className="section-title">{t("chartAnalysis.uploadHeading")}</p>
        <label className="field" style={{ marginBottom: "1rem" }}>
          {t("chartAnalysis.uploadLabel")}
          <input className="input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onFileChange} />
        </label>

        {previewUrl && (
          <img
            src={previewUrl}
            alt={t("chartAnalysis.previewAlt")}
            style={{ maxWidth: "100%", maxHeight: 320, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", marginBottom: "1rem", display: "block" }}
          />
        )}

        <div className="field" style={{ marginBottom: "1rem" }}>
          {t("chartAnalysis.horizon")}
          <div className="tabs">
            <button type="button" className={mode === "daytrade" ? "active" : ""} onClick={() => setMode("daytrade")}>{t("chartAnalysis.dayTrade")}</button>
            <button type="button" className={mode === "swing" ? "active" : ""} onClick={() => setMode("swing")}>{t("chartAnalysis.swingTrade")}</button>
          </div>
        </div>

        <button className="ai-btn" onClick={analyze} disabled={!file || loading}>
          {loading ? t("chartAnalysis.analyzing") : t("chartAnalysis.analyzeButton")}
        </button>
        <p className="note" style={{ marginTop: 8 }}>{t("chartAnalysis.maxPerDay")}</p>

        {error && <div className="error-box" style={{ marginTop: 10 }}>{t("tools.shared.errorPrefix")}{error}</div>}
        {result && <div className="ai-result">{result}</div>}
      </div>

      <div className="disclaimer">
        {t("chartAnalysis.disclaimer")}
      </div>
    </div>
  );
}
