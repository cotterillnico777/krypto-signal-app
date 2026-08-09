import { createSupabaseServerClient } from "../../../lib/supabase/server";

// Pages-Router-Äquivalent zu einer App-Router-Callback-route.ts: tauscht den
// PKCE-Code (von OAuth/Magic-Link) serverseitig gegen eine Session, der
// Server-Client schreibt die Session-Cookies direkt auf diese Response.
export default async function handler(req, res) {
  const { code, redirect } = req.query;
  const destination = typeof redirect === "string" && redirect.startsWith("/") ? redirect : "/";

  if (typeof code === "string") {
    const supabase = createSupabaseServerClient({ req, res });
    await supabase.auth.exchangeCodeForSession(code);
  }

  res.redirect(302, destination);
}
