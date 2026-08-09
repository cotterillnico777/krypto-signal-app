import { createSupabaseServerClient } from "../supabase/server";
import { getProfileAccess } from "./getProfileAccess";

// getServerSideProps-Gate für geschützte Seiten. Direkt als
// `export const getServerSideProps = requireActiveAccess;` nutzbar.
//
// WICHTIG: supabase.auth.getUser() statt getSession() -- getUser()
// verifiziert das Token gegen den Supabase-Auth-Server, getSession() liest
// nur das (client-schreibbare) Cookie ohne Verifikation. Das ist Supabases
// eigene Sicherheitsempfehlung für serverseitige Prüfungen.
export async function requireActiveAccess(context) {
  const { req, res, resolvedUrl } = context;
  // Nutzer-/Trial-Status ist personenbezogen und ändert sich (Trial läuft ab,
  // Abo-Wechsel) -- darf nie zwischengespeichert werden, sonst kann eine
  // clientseitige Navigation eine veraltete Zugangsentscheidung anzeigen.
  res.setHeader("Cache-Control", "private, no-store");
  const supabase = createSupabaseServerClient({ req, res });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      redirect: {
        destination: `/login?redirect=${encodeURIComponent(resolvedUrl || "/")}`,
        permanent: false,
      },
    };
  }

  const access = await getProfileAccess(supabase, user.id);

  if (!access.active) {
    return { redirect: { destination: "/upgrade", permanent: false } };
  }

  return {
    props: {
      user: { id: user.id, email: user.email },
      access,
    },
  };
}
