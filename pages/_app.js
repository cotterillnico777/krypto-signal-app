import { useEffect } from "react";
import "../styles/globals.css";
import { applyAppModeAttribute } from "../lib/deviceMode";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker Registrierung fehlgeschlagen:", err);
      });
    }

    // data-app-mode="standalone"|"browser" auf <html> -- lässt CSS ohne
    // eigenen Re-Render darauf reagieren (z.B. Safe-Area-Padding im
    // installierten Modus, wo die Browser-UI fehlt).
    applyAppModeAttribute();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", applyAppModeAttribute);
    return () => mq.removeEventListener?.("change", applyAppModeAttribute);
  }, []);

  return <Component {...pageProps} />;
}
