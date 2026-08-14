import { requireActiveAccessApi } from "../../lib/auth/requireActiveAccessApi";
import { getSupabaseAdminClient } from "../../lib/supabase/admin";

// Liefert den eigenen Referral-Code (über die RLS-gescopte Session, jeder
// Nutzer darf sein eigenes Profil lesen) und die Anzahl der Anmeldungen über
// den eigenen Link (braucht den Service-Role-Client, da RLS Nutzern nicht
// erlaubt, fremde profiles-Zeilen zu sehen -- selbst nicht nur zum Zählen).
export default async function handler(req, res) {
  const ctx = await requireActiveAccessApi(req, res);
  if (!ctx) return;

  try {
    const { data: profile, error: profileErr } = await ctx.supabase
      .from("profiles")
      .select("referral_code")
      .eq("id", ctx.user.id)
      .single();
    if (profileErr) throw profileErr;

    let referredCount = 0;
    const admin = getSupabaseAdminClient();
    if (admin) {
      const { count, error: countErr } = await admin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("referred_by", ctx.user.id);
      if (countErr) throw countErr;
      referredCount = count ?? 0;
    }

    res.status(200).json({ referralCode: profile.referral_code, referredCount });
  } catch (err) {
    res.status(500).json({ error: err.message || "Referral-Daten konnten nicht geladen werden." });
  }
}
