import { useEffect, useState } from "react";
import Link from "next/link";

// Kurzer Willkommens-Walkthrough für Neulinge -- Pull-Faktor #1 aus der
// Retail-/Neuling-Roadmap. Zeigt in wenigen Sätzen, was die App tut, wie die
// neue Klartext-Erklärung (explainSignal) und die Glossar-Tooltips zu lesen
// sind, und verweist auf /validation als Vertrauensanker -- bevor der Nutzer
// mit einer dichten Dashboard-Ansicht allein gelassen wird. Einmal pro
// Browser via localStorage-Flag, gleiches Muster wie InstallPrompt.js'
// "installBannerDismissed".
const STEPS = [
  {
    title: "Willkommen beim Krypto Signal Dashboard 👋",
    body: "Diese App kombiniert technische Indikatoren, das gesamtwirtschaftliche Umfeld und Markt-Sentiment zu einer Kaufen/Verkaufen/Halten-Einschätzung pro Coin -- kurz erklärt statt als Blackbox.",
  },
  {
    title: "Jedes Signal wird erklärt",
    body: "Unter jedem Badge steht ein Satz, WARUM die App gerade diese Einschätzung zeigt. Fachbegriffe wie RSI oder MACD haben zusätzlich ein ⓘ-Symbol mit einer kurzen Erklärung -- einfach mit der Maus draufhalten.",
  },
  {
    title: "Nichts wird einfach behauptet",
    body: (
      <>
        Jeder Faktor, der in die Signale einfließt, wurde vorher empirisch getestet -- auch die Fälle, in denen etwas NICHT geholfen hat, werden gezeigt. Alles nachvollziehbar auf der{" "}
        <Link href="/validation">Validierungs-Historie</Link>-Seite.
      </>
    ),
  },
  {
    title: "Ein Werkzeug, kein Anlageberater",
    body: "Die App ersetzt keine eigene Recherche und ist keine Anlageberatung. Der Backtest lässt dich Strategien selbst prüfen, bevor du dich auf ein Signal verlässt.",
  },
];

export default function OnboardingTour() {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem("onboardingTourSeen") === "1") return;
    setVisible(true);
  }, []);

  function finish() {
    localStorage.setItem("onboardingTourSeen", "1");
    setVisible(false);
  }

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div className="onboarding-overlay" role="dialog" aria-modal="true">
      <div className="onboarding-card card">
        <p className="onboarding-progress">{step + 1} / {STEPS.length}</p>
        <h2 className="onboarding-title">{current.title}</h2>
        <p className="onboarding-body">{current.body}</p>
        <div className="onboarding-actions">
          <button className="icon-btn" onClick={finish}>Überspringen</button>
          <div style={{ display: "flex", gap: 8 }}>
            {step > 0 && <button className="icon-btn" onClick={() => setStep((s) => s - 1)}>Zurück</button>}
            {!isLast && <button className="icon-btn primary" onClick={() => setStep((s) => s + 1)}>Weiter</button>}
            {isLast && <button className="icon-btn primary" onClick={finish}>Los geht's</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
