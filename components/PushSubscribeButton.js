import { useEffect, useState } from "react";
import { isStandalone, isIos } from "../lib/deviceMode";
import { useLanguage } from "../lib/i18n";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export default function PushSubscribeButton() {
  const { t } = useLanguage();
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [iosNeedsInstall, setIosNeedsInstall] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(ok);
    // iOS Safari meldet PushManager zwar als vorhanden, liefert aber nur im
    // installierten Home-Bildschirm-Modus ("standalone") echte Push-Zustellung
    // -- ein Subscribe-Versuch im normalen Browser-Tab scheitert sonst mit
    // einem für Nutzer nicht nachvollziehbaren Fehler. Statt das zu riskieren,
    // wird hier direkt ein erklärender Hinweis statt des Buttons gezeigt.
    if (ok && isIos() && !isStandalone()) {
      setIosNeedsInstall(true);
      return;
    }
    if (!ok) return;
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidKey) throw new Error(t("pushButton.notConfigured"));

      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error(t("pushButton.permissionDenied"));

      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
      if (!res.ok) throw new Error((await res.json()).error || t("pushButton.saveFailed"));

      setSubscribed(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    setBusy(true);
    setError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  if (!supported) return null;

  if (iosNeedsInstall) {
    return (
      <button
        className="icon-btn"
        disabled
        title={t("pushButton.iosTooltip")}
      >
        {t("pushButton.iosButton")}
      </button>
    );
  }

  return (
    <button
      className={`icon-btn${subscribed ? "" : " primary"}`}
      onClick={subscribed ? unsubscribe : subscribe}
      disabled={busy}
      title={error || (subscribed ? t("pushButton.disableTooltip") : t("pushButton.enableTooltip"))}
    >
      {busy ? "…" : subscribed ? t("pushButton.active") : t("pushButton.enable")}
    </button>
  );
}
