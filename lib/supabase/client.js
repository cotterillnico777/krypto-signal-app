import { createBrowserClient } from "@supabase/ssr";

let client = null;

// Browser-Singleton – für Client-Komponenten (Login/Signup-Formulare,
// Logout-Button). Serverseitig NICHT verwenden, siehe server.js/admin.js.
export function getSupabaseBrowserClient() {
  if (client) return client;
  client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  return client;
}
