import LogoutButton from "../components/LogoutButton";

// Ziel von requireActiveAccess, wenn Trial abgelaufen ist und kein aktives
// Abo besteht. Bewusst NICHT selbst gegatet (sonst Redirect-Schleife) und
// bewusst ohne Stripe-Integration -- das ist die Phase-2-Nahtstelle, der CTA
// hier wird später zum Auslöser der Stripe-Checkout-Session.
export default function Upgrade() {
  return (
    <div className="container auth-page">
      <div className="auth-card card">
        <div className="brand" style={{ marginBottom: "1.5rem" }}>
          <div className="brand-mark">₿</div>
          <div>
            <h1>Testphase abgelaufen</h1>
            <p className="subtitle">Krypto Signal Dashboard</p>
          </div>
        </div>
        <p>
          Deine 14-tägige kostenlose Testphase ist vorbei. Ein bezahltes Abo folgt in Kürze — bis dahin danke fürs
          Ausprobieren!
        </p>
        <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem" }}>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
