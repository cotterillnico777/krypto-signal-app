import { requireActiveAccessApi } from "../../../lib/auth/requireActiveAccessApi";

// Speichert die Onboarding-Zielauswahl (components/OnboardingTour.js, Schritt
// 0) in profiles.onboarding_goal -- braucht supabase/migrations/0006_
// onboarding_goal.sql (noch nicht gegen die Produktions-DB ausgeführt, siehe
// dortiger Kommentar). Schlägt bis dahin sauber mit einer Postgres-
// "column does not exist"-Fehlermeldung fehl, ohne die App zu crashen -- das
// Onboarding selbst blockiert nicht darauf (siehe OnboardingTour.js, die
// Auswahl wird optimistisch im UI übernommen, ein Fehler hier wird nur
// geloggt).
const ALLOWED_GOALS = [
  "learn_money",
  "start_investing",
  "understand_etfs",
  "understand_crypto",
  "learn_trading",
  "structure_trading",
];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  const { goal } = req.body || {};
  if (!ALLOWED_GOALS.includes(goal)) {
    return res.status(400).json({ error: "Ungültiges Ziel." });
  }

  try {
    const { error } = await ctx.supabase.from("profiles").update({ onboarding_goal: goal }).eq("id", ctx.user.id);
    if (error) throw error;
    res.status(200).json({ ok: true });
  } catch (err) {
    // Postgres 42703 = "column does not exist" -- erwartbar, solange
    // supabase/migrations/0006_onboarding_goal.sql noch nicht produktiv
    // ausgeführt ist. Eigener Status statt generischem 500, damit das in
    // Logs/Monitoring nicht wie ein echter Bug aussieht -- der Client
    // (OnboardingTour.js) hat die Auswahl bereits lokal gespeichert und
    // swallowed diesen Fehler ohnehin, funktional ändert sich nichts.
    const missingColumn = err.code === "42703" || /column .* does not exist/i.test(err.message || "");
    if (missingColumn) {
      return res.status(503).json({ error: "onboarding_goal-Spalte noch nicht verfügbar.", code: "column_missing" });
    }
    res.status(500).json({ error: err.message || "Konnte nicht gespeichert werden." });
  }
}
