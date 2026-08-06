import { useEffect, useState } from "react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

export default function InstallPrompt() {
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
          ? 'Zum Startbildschirm hinzufügen: Teilen-Symbol → "Zum Home-Bildschirm"'
          : "Als App installieren für schnelleren Zugriff"}
      </span>
      <span className="actions">
        {deferredPrompt && (
          <button className="icon-btn primary" onClick={install}>Installieren</button>
        )}
        <button className="dismiss" onClick={dismiss}>✕</button>
      </span>
    </div>
  );
}
