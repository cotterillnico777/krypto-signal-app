import { useEffect, useState } from "react";
import { isStandalone, isIos } from "../lib/deviceMode";
import { useLanguage } from "../lib/i18n";

export default function InstallPrompt() {
  const { t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(true);
  const [showIosHint, setShowIosHint] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (typeof window !== "undefined" && localStorage.getItem("installBannerDismissed") === "1") return;

    setDismissed(false);

    function onBeforeInstall(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    if (isIos()) setShowIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("installBannerDismissed", "1");
  }

  async function install() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    dismiss();
  }

  if (dismissed || (!deferredPrompt && !showIosHint)) return null;

  return (
    <div className="toast-banner">
      <span className="msg">
        📲 {showIosHint && !deferredPrompt
          ? t("installPrompt.iosHint")
          : t("installPrompt.genericHint")}
      </span>
      <span className="actions">
        {deferredPrompt && (
          <button className="icon-btn primary" onClick={install}>{t("installPrompt.install")}</button>
        )}
        <button className="dismiss" onClick={dismiss}>✕</button>
      </span>
    </div>
  );
}
