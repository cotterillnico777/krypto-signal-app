import { createServerClient } from "@supabase/ssr";
import { parse as parseCookie, serialize as serializeCookie } from "cookie";

// Server-Client für Pages Router: getServerSideProps-Context und API-Routen
// haben beide dieselbe req/res-Form (Node http.IncomingMessage/ServerResponse),
// ein Cookie-Adapter reicht für beide Aufrufer.
//
// Zwei Stolperfallen, die dieser Adapter bewusst vermeidet:
// 1. @supabase/ssr erwartet getAll()/setAll() (nicht das ältere get/set/remove).
// 2. Supabase-Auth-Cookies können auf mehrere Set-Cookie-Header aufgeteilt sein
//    (chunked, z.B. bei OAuth-Tokens). res.setHeader("Set-Cookie", value) muss
//    darum EINMAL mit einem Array aller Werte aufgerufen werden – sonst
//    überschreibt jeder einzelne Aufruf die vorherigen Set-Cookie-Header.
export function createSupabaseServerClient({ req, res }) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          const parsed = parseCookie(req.headers.cookie || "");
          return Object.entries(parsed).map(([name, value]) => ({ name, value }));
        },
        setAll(cookiesToSet, headers) {
          const existing = res.getHeader("Set-Cookie");
          const existingArr = existing ? (Array.isArray(existing) ? existing : [existing]) : [];
          const newArr = cookiesToSet.map(({ name, value, options }) => serializeCookie(name, value, options));
          res.setHeader("Set-Cookie", [...existingArr, ...newArr]);
          if (headers) {
            for (const [key, value] of Object.entries(headers)) res.setHeader(key, value);
          }
        },
      },
    }
  );
}
