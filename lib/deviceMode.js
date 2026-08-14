// Erkennt, ob die App gerade als installierte (Home-Bildschirm-)App im
// eigenen Fenster läuft ("standalone", ohne Browser-Chrome) oder ganz normal
// über einen Browser-Tab -- unabhängig von Bildschirmgröße/Gerätetyp.
// Wird an zwei Stellen gebraucht, die sich dadurch unterschiedlich verhalten
// müssen: (1) Push-Benachrichtigungen funktionieren auf iOS Safari NUR im
// installierten Standalone-Modus, ein Versuch im normalen Browser-Tab scheitert
// mit einem kryptischen Fehler statt einer erklärenden Meldung; (2) im
// Standalone-Modus fehlt die Browser-UI, daher braucht der Header zusätzliches
// Safe-Area-Padding (Notch/Home-Indikator), das im Browser-Tab nicht nötig ist.
export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
}

export function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) && !window.MSStream;
}

// Grober Geräte-Typ nach Viewport-Breite -- dieselbe 720px-Schwelle wie die
// bestehenden CSS-Breakpoints in globals.css (.grid-3, resize_window "mobile"-
// Preset), damit JS- und CSS-Einschätzung von "mobil" nicht auseinanderlaufen.
export function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 720px)").matches;
}

// Setzt data-app-mode="standalone"|"browser" auf <html>, damit CSS ohne
// JS-Re-Render darauf reagieren kann (z.B. Safe-Area-Padding). Einmal beim
// Mount aufrufen (z.B. in pages/_app.js).
export function applyAppModeAttribute() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.appMode = isStandalone() ? "standalone" : "browser";
}
