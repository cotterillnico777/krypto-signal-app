// Diese Route holt echte Makrodaten von FRED (Federal Reserve Economic Data).
// Du brauchst dafür einen kostenlosen API-Key, siehe README.md.
//
// Serien:
// - M2SL: M2-Geldmenge (monatlich, saisonbereinigt) in Mrd. USD
// - FEDFUNDS: Effektiver US-Leitzins (monatlich) in %

export default async function handler(req, res) {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    res.status(500).json({
      error:
        "FRED_API_KEY fehlt. Lege eine .env.local Datei an mit deinem kostenlosen FRED-Schlüssel (siehe README.md).",
    });
    return;
  }

  try {
    const fetchSeries = async (seriesId) => {
      const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&sort_order=desc&limit=24`;
      const r = await fetch(url);
      if (!r.ok) {
        throw new Error(`FRED Fehler (${r.status}) für Serie ${seriesId}`);
      }
      const data = await r.json();
      return data.observations
        .reverse()
        .map((o) => ({ date: o.date, value: parseFloat(o.value) }))
        .filter((o) => !Number.isNaN(o.value));
    };

    const [m2, fedfunds] = await Promise.all([
      fetchSeries("M2SL"),
      fetchSeries("FEDFUNDS"),
    ]);

    res.status(200).json({ m2, fedfunds });
  } catch (err) {
    res.status(500).json({ error: err.message || "Unbekannter Fehler beim Laden der Makrodaten" });
  }
}
