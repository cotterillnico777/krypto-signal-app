import { createClient } from "@supabase/supabase-js";

let client = null;

// Service-Role-Client: umgeht Row Level Security komplett. Ausschließlich aus
// pages/api/** importieren (nie in etwas, das client-seitig laufen könnte) –
// der Service-Role-Key darf niemals ins Browser-Bundle gelangen. Genutzt vom
// Cron-Job, um über alle Nutzer hinweg aktive Push-Abos zu lesen (der Cron hat
// keine eigene Nutzer-Session, gegen die RLS greifen könnte).
export function getSupabaseAdminClient() {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;
  client = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  return client;
}
