import Link from "next/link";
import { useLanguage } from "../lib/i18n";

// access kommt aus getProfileAccess() (per getServerSideProps als Prop
// durchgereicht) -- zeigt nichts an, solange ein echtes Abo aktiv ist.
export default function TrialBanner({ access }) {
  const { t } = useLanguage();
  if (!access || !access.trialing) return null;

  const expiringSoon = access.trialDaysLeft <= 3;

  return (
    <div className={`trial-banner${expiringSoon ? " expiring" : ""}`}>
      {access.trialDaysLeft > 0
        ? t(access.trialDaysLeft === 1 ? "trialBanner.remainingOne" : "trialBanner.remainingMany", { days: access.trialDaysLeft })
        : t("trialBanner.today")}
      {" · "}
      <Link href="/upgrade">{t("trialBanner.details")}</Link>
    </div>
  );
}
