import { useState } from "react";
import AppHeader from "../components/AppHeader";
import { requireActiveAccess } from "../lib/auth/requireActiveAccess";

export const getServerSideProps = requireActiveAccess;

const MAX_FILE_BYTES = 6 * 1024 * 1024;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // reader.result hat die Form "data:image/png;base64,AAAA..." --
      // Anthropics API will nur den reinen Base64-Teil ohne Data-URL-Prefix.
      const [, base64] = reader.result.split(",");
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
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
      setError("Bild zu groß (max. 6MB).");
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
      const imageBase64 = await readFileAsBase64(file);
      const res = await fetch("/api/chart-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64, mediaType: file.type, mode }),
      });
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
          Bild (PNG, JPEG, WebP, GIF -- max. 6MB)
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
