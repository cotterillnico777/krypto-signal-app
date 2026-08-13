// Dieselbe "ist der Zugang aktiv"-Logik wie lib/auth/getProfileAccess.js,
// hier aber direkt auf einer bereits gejointen Profil-Zeile angewendet
// (statt selbst zu queryen) -- genutzt von beiden Cron-Jobs
// (check-signals.js, weekly-digest.js), die ohne eigene Nutzer-Session über
// den Service-Role-Client lesen und die Filterung selbst übernehmen müssen.
export function hasActiveAccess(profile) {
  if (!profile) return false;
  const trialing = profile.subscription_status === "trialing" && new Date(profile.trial_ends_at) > new Date();
  return profile.subscription_status === "active" || trialing;
}
