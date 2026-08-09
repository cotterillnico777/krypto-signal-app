import { createSupabaseServerClient } from "../supabase/server";
import { getProfileAccess } from "./getProfileAccess";

// API-Route-Gate. Schreibt bei Fehlschlag die Response selbst und gibt null
// zurück -- Aufrufer bricht dann einfach ab:
//
//   const ctx = await requireActiveAccessApi(req, res);
//   if (!ctx) return;
//
// Wichtig für kostenintensive/rechenschwere Routen (analyze.js kostet echtes
// Anthropic-Geld pro Aufruf, walkforward.js hat maxDuration 60) -- der Guard
// steht bewusst VOR jeder Berechnung.
export async function requireActiveAccessApi(req, res) {
  // Siehe requireActiveAccess.js -- Zugangsentscheidung ist personenbezogen
  // und darf nicht zwischengespeichert werden.
  res.setHeader("Cache-Control", "private, no-store");
  const supabase = createSupabaseServerClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    res.status(401).json({ error: "Nicht angemeldet." });
    return null;
  }

  const access = await getProfileAccess(supabase, user.id);

  if (!access.active) {
    res.status(402).json({ error: "Testphase abgelaufen. Bitte Abo abschließen." });
    return null;
  }

  return { user, access, supabase };
}
