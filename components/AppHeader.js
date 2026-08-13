import Link from "next/link";
import TrialBanner from "./TrialBanner";
import LogoutButton from "./LogoutButton";

// Dashboard ist jetzt Teil der Liste (statt eines separaten "← Dashboard"-
// Sonderfalls) -- alle Ziele werden immer als vollständige Reiter-Zeile
// gerendert, das aktuelle wird per .active hervorgehoben statt weggelassen.
const TOOLS = [
  { key: "dashboard", href: "/", icon: "🏠", label: "Dashboard" },
  { key: "backtest", href: "/backtest", icon: "📊", label: "Backtest" },
  { key: "optimize", href: "/optimize", icon: "🔬", label: "Optimierung" },
  { key: "walkforward", href: "/walkforward", icon: "📈", label: "Walk-Forward" },
  { key: "portfolio", href: "/portfolio", icon: "💼", label: "Portfolio" },
  { key: "trades", href: "/trades", icon: "📓", label: "Trades" },
  { key: "risk-reward", href: "/risk-reward", icon: "⚖️", label: "R:R-Rechner" },
  { key: "validation", href: "/validation", icon: "✅", label: "Validierung" },
];

// Gemeinsame Header-Komponente für alle gegateten Seiten. Zwei getrennte
// Zeilen statt einer gemeinsam umbrechenden: `.nav-tabs` (horizontal
// scrollbare Reiter-Leiste für alle Seitenziele) und `.header-actions`
// (Account-/Seiten-Aktionen: Push/Aktualisieren-Slot, E-Mail, Abmelden) --
// bewusst getrennt, weil Nav-Ziele und Aktions-Buttons konzeptionell
// unterschiedliche Dinge sind, auch wenn sie vorher in derselben
// umbrechenden Reihe standen. `children` ist der Slot für seitenspezifische
// Extra-Aktionen (z.B. PushSubscribeButton + Aktualisieren-Button nur im
// Dashboard).
export default function AppHeader({ title, subtitle, active, user, access, children }) {
  return (
    <>
      <header className="app-header">
        <div className="brand">
          <div className="brand-mark">₿</div>
          <div>
            <h1>{title}</h1>
            <p className="subtitle">{subtitle}</p>
          </div>
        </div>
        <div className="header-actions">
          {children}
          {user && (
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>
      <nav className="nav-tabs">
        {TOOLS.map((t) => (
          <Link key={t.key} href={t.href} className={`nav-tab${t.key === active ? " active" : ""}`}>
            {t.icon} {t.label}
          </Link>
        ))}
      </nav>
      <TrialBanner access={access} />
    </>
  );
}
