import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import TrialBanner from "./TrialBanner";
import LogoutButton from "./LogoutButton";

// Reiter sind nach Themen gruppiert statt einer einzigen langen Liste --
// bei mittlerweile 10 Zielen wurde die flache Reiter-Leiste unübersichtlich.
// Dashboard bleibt eigenständig (Startpunkt), die übrigen 9 sind in 3
// thematische Gruppen aufgeteilt, die beim Klick eine Dropdown-Liste ihrer
// Unterpunkte aufklappen (bauen sich untereinander/vertikal auf).
const NAV_GROUPS = [
  { key: "dashboard", href: "/", icon: "🏠", label: "Dashboard" },
  {
    key: "analyse",
    icon: "📊",
    label: "Analyse",
    items: [
      { key: "backtest", href: "/backtest", icon: "📊", label: "Backtest" },
      { key: "optimize", href: "/optimize", icon: "🔬", label: "Optimierung" },
      { key: "walkforward", href: "/walkforward", icon: "📈", label: "Walk-Forward" },
      { key: "portfolio", href: "/portfolio", icon: "💼", label: "Portfolio" },
      { key: "chart-analysis", href: "/chart-analysis", icon: "🔍", label: "Chart-Analyse" },
    ],
  },
  {
    key: "journal",
    icon: "📓",
    label: "Journal",
    items: [
      { key: "holdings", href: "/holdings", icon: "💰", label: "Mein Portfolio" },
      { key: "trades", href: "/trades", icon: "📓", label: "Trades" },
      { key: "risk-reward", href: "/risk-reward", icon: "⚖️", label: "R:R-Rechner" },
      { key: "alerts", href: "/alerts", icon: "🔔", label: "Preis-Alarme" },
    ],
  },
  {
    key: "info",
    icon: "ℹ️",
    label: "Info",
    items: [
      { key: "validation", href: "/validation", icon: "✅", label: "Validierung" },
      { key: "glossar", href: "/glossar", icon: "📖", label: "Glossar" },
    ],
  },
];

function NavDropdown({ group, active }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState(null);
  const btnRef = useRef(null);
  const dropdownRef = useRef(null);
  const isActiveGroup = group.items.some((i) => i.key === active);

  // .nav-tabs ist horizontal scrollbar (overflow-x: auto) -- per CSS-Spec
  // wird overflow-y dadurch implizit auch "auto" statt "visible", ein normal
  // absolut positioniertes Dropdown würde also am Rand der Reiter-Leiste
  // abgeschnitten. Als Portal direkt in <body> gerendert und per
  // getBoundingClientRect() (position: fixed) platziert umgeht das.
  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (btnRef.current?.contains(e.target)) return;
      if (dropdownRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  return (
    <div className="nav-group">
      <button type="button" ref={btnRef} className={`nav-tab${isActiveGroup ? " active" : ""}`} onClick={toggleOpen}>
        {group.icon} {group.label} <span className="nav-caret">{open ? "▴" : "▾"}</span>
      </button>
      {open && coords && typeof document !== "undefined" && createPortal(
        <div className="nav-dropdown" ref={dropdownRef} style={{ top: coords.top, left: coords.left }}>
          {group.items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              className={`nav-dropdown-item${item.key === active ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              {item.icon} {item.label}
            </Link>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

// Gemeinsame Header-Komponente für alle gegateten Seiten. Zwei getrennte
// Zeilen statt einer gemeinsam umbrechenden: `.nav-tabs` (Reiter-Leiste für
// alle Seitenziele, gruppiert) und `.header-actions` (Account-/Seiten-
// Aktionen: Push/Aktualisieren-Slot, E-Mail, Abmelden). `children` ist der
// Slot für seitenspezifische Extra-Aktionen (z.B. PushSubscribeButton +
// Aktualisieren-Button nur im Dashboard).
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
        {NAV_GROUPS.map((g) =>
          g.items ? (
            <NavDropdown key={g.key} group={g} active={active} />
          ) : (
            <Link key={g.key} href={g.href} className={`nav-tab${g.key === active ? " active" : ""}`}>
              {g.icon} {g.label}
            </Link>
          )
        )}
      </nav>
      <TrialBanner access={access} />
    </>
  );
}
