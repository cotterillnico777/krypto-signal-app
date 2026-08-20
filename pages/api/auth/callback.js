import { createSupabaseServerClient } from "../../../lib/supabase/server";

// Pages-Router-Äquivalent zu einer App-Router-Callback-route.ts: tauscht den
// PKCE-Code (von OAuth/Magic-Link) serverseitig gegen eine Session, der
// Server-Client schreibt die Session-Cookies direkt auf diese Response.
export default async function handler(req, res) {
  const { code, redirect } = req.query;
  // Nur ein absoluter, gleicher-Origin-Pfad ist erlaubt -- "//evil.com"
  // beginnt zwar auch mit "/", ist aber ein protokoll-relativer Link, den
  // Browser als externe URL auflösen (offener Redirect). redirect wird nur
  // aus unserer eigenen /login-Seite gesetzt (siehe pages/login.js
  // callbackUrl()), kommt hier aber als Nutzer-kontrollierter Query-Param
  // an -- deshalb serverseitig zusätzlich absichern.
  const isSafeRedirect = typeof redirect === "string" && redirect.startsWith("/") && !redirect.startsWith("//");
  const destination = isSafeRedirect ? redirect : "/";
  const redirectSuffix = isSafeRedirect ? `&redirect=${encodeURIComponent(destination)}` : "";

  if (typeof code !== "string") {
    // Kein Code im Callback -- z.B. ein abgelaufener/ungültiger Magic-Link,
    // den Supabase ohne Code (nur mit error/error_description) hierher
    // weiterleitet. Ohne diesen Zweig würde die Seite kommentarlos zur
    // Zielseite weiterleiten, die mangels Session sofort wieder zu /login
    // zurückspringt -- ohne jede Erklärung für den Nutzer.
    res.redirect(302, `/login?authError=link_invalid${redirectSuffix}`);
    return;
  }

  const supabase = createSupabaseServerClient({ req, res });
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    res.redirect(302, `/login?authError=link_invalid${redirectSuffix}`);
    return;
  }

  res.redirect(302, destination);
}
