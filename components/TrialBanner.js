import Link from "next/link";

// access kommt aus getProfileAccess() (per getServerSideProps als Prop
// durchgereicht) -- zeigt nichts an, solange ein echtes Abo aktiv ist.
export default function TrialBanner({ access }) {
  if (!access || !access.trialing) return null;

  const expiringSoon = access.trialDaysLeft <= 3;

  return (
    <div className={`trial-banner${expiringSoon ? " expiring" : ""}`}>
      {access.trialDaysLeft > 0
        ? `${access.trialDaysLeft} ${access.trialDaysLeft === 1 ? "Tag" : "Tage"} in der Testphase übrig`
        : "Testphase läuft heute ab"}
      {" · "}
      <Link href="/upgrade">Details</Link>
    </div>
  );
}
