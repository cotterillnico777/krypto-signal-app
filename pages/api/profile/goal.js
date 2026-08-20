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
    res.status(500).json({ error: err.message || "Konnte nicht gespeichert werden." });
  }
}
