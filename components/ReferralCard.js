import { useEffect, useState } from "react";

// Pull-Faktor #4: eigener Referral-Link, der beiden Seiten +7 Tage Trial
// bringt (Logik in supabase/migrations/0003_referrals.sql, DB-Trigger
// handle_new_user()). Rendert bewusst nichts, solange /api/referral noch
// lädt ODER einen Fehler zurückgibt (z.B. wenn die Migration noch nicht
// angewendet wurde) -- kein kaputtes UI, einfach unsichtbar bis verfügbar.
export default function ReferralCard() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/referral")
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setData(d);
      })
      .catch(() => {});
  }, []);

  if (!data || typeof window === "undefined") return null;

  const link = `${window.location.origin}/signup?ref=${data.referralCode}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard-API nicht verfügbar (z.B. kein sicherer Kontext) -- Nutzer
      // kann den Link stattdessen manuell aus dem Feld markieren/kopieren.
    }
  }

  return (
    <div className="card" style={{ marginBottom: "1rem" }}>
      <p className="section-title">🎁 Freunde einladen</p>
      <p className="note" style={{ marginBottom: 10 }}>
        Teile deinen Link -- du und dein Freund bekommt je +7 Tage Trial geschenkt.
        {data.referredCount > 0 && ` Bisher ${data.referredCount} Anmeldung${data.referredCount === 1 ? "" : "en"} über deinen Link.`}
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input
          className="input"
          readOnly
          value={link}
          style={{ flex: 1, minWidth: 220 }}
          onClick={(e) => e.target.select()}
        />
        <button className="icon-btn primary" onClick={copyLink}>{copied ? "Kopiert ✓" : "Link kopieren"}</button>
      </div>
    </div>
  );
}
