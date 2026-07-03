// Fear & Greed Index von alternative.me - kostenlos, kein Key nötig
export default async function handler(req, res) {
  try {
    const r = await fetch("https://api.alternative.me/fng/?limit=30");
    if (!r.ok) throw new Error(`Fear & Greed Fehler (${r.status})`);
    const data = await r.json();
    const latest = data.data[0];
    const history = data.data.reverse().map((d) => ({
      value: parseInt(d.value),
      label: d.value_classification,
      date: new Date(d.timestamp * 1000).toLocaleDateString("de-DE"),
    }));
    res.status(200).json({
      value: parseInt(latest.value),
      label: latest.value_classification,
      history,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
