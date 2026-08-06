import { useEffect } from "react";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker Registrierung fehlgeschlagen:", err);
      });
    }
  }, []);

  return <Component {...pageProps} />;
}
