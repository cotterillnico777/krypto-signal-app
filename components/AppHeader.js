import Link from "next/link";
import TrialBanner from "./TrialBanner";
import LogoutButton from "./LogoutButton";

const TOOLS = [
  { key: "backtest", href: "/backtest", icon: "📊", label: "Backtest" },
  { key: "optimize", href: "/optimize", icon: "🔬", label: "Optimierung" },
  { key: "walkforward", href: "/walkforward", icon: "📈", label: "Walk-Forward" },
  { key: "portfolio", href: "/portfolio", icon: "💼", label: "Portfolio" },
  { key: "trades", href: "/trades", icon: "📓", label: "Trades" },
  { key: "risk-reward", href: "/risk-reward", icon: "⚖️", label: "R:R-Rechner" },
  { key: "validation", href: "/validation", icon: "✅", label: "Validierung" },
];

// Gemeinsame Header-Komponente für alle 5 gegateten Seiten -- ersetzt das
// zuvor 5x duplizierte <header className="app-header">-Markup. `active`
// ist der eigene Seiten-Key (oder "dashboard"), damit der jeweils eigene
// Nav-Link weggelassen wird, genau wie im bisherigen handgeschriebenen
// Markup jeder Seite. `children` ist der Slot für seitenspezifische Extra-
// Aktionen (z.B. PushSubscribeButton + Aktualisieren-Button nur im Dashboard).
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
          {TOOLS.filter((t) => t.key !== active).map((t) => (
            <Link key={t.key} href={t.href} className="icon-btn">
              {t.icon} {t.label}
            </Link>
          ))}
          {active !== "dashboard" && (
            <Link href="/" className="icon-btn">
              ← Dashboard
            </Link>
          )}
          {children}
          {user && (
            <span className="user-email" title={user.email}>
              {user.email}
            </span>
          )}
          <LogoutButton />
        </div>
      </header>
      <TrialBanner access={access} />
    </>
  );
}
