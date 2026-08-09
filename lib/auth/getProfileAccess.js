// Berechnet aus der profiles-Zeile, ob der Zugang gerade aktiv ist. Bewusst
// zur Lesezeit berechnet statt als DB-generated-column (now() ist nicht
// immutable) -- dieselbe Logik nutzen sowohl das Seiten-/API-Gating als auch
// die Cron-Abo-Abfrage (dort direkt als SQL-Filter nachgebildet).
export async function getProfileAccess(supabase, userId) {
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("trial_ends_at, subscription_status")
    .eq("id", userId)
    .single();

  if (error || !profile) {
    return { active: false, trialing: false, trialDaysLeft: 0, trialEndsAt: null, subscriptionStatus: null };
  }

  const trialEndsAt = new Date(profile.trial_ends_at);
  const trialing = profile.subscription_status === "trialing" && trialEndsAt > new Date();
  const active = profile.subscription_status === "active" || trialing;
  const trialDaysLeft = trialing ? Math.max(0, Math.ceil((trialEndsAt - new Date()) / (24 * 60 * 60 * 1000))) : 0;

  return {
    active,
    trialing,
    trialDaysLeft,
    trialEndsAt: profile.trial_ends_at,
    subscriptionStatus: profile.subscription_status,
  };
}
