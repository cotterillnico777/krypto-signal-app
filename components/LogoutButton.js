import { useRouter } from "next/router";
import { getSupabaseBrowserClient } from "../lib/supabase/client";

export default function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <button className="icon-btn" onClick={handleLogout}>
      Abmelden
    </button>
  );
}
