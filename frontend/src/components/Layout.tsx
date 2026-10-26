import { useEffect, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { IconMenu, IconX, IconTag, IconTruck, IconPrinter } from "../ui/icons";

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="MoveEasy home">
      <span className="logo-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="28" height="28">
          <rect x="2" y="6" width="28" height="22" rx="4" fill="#C9A774" />
          <rect x="2" y="6" width="28" height="6" rx="3" fill="#B08D57" />
          <rect x="9" y="15" width="9" height="9" rx="1.5" fill="#2B211A" />
          <rect x="11.5" y="17.5" width="4" height="4" fill="#C9A774" />
          <rect x="20" y="15" width="5" height="2.4" rx="1" fill="#a9452a" />
          <rect x="20" y="19.5" width="5" height="2.4" rx="1" fill="#2B211A" />
        </svg>
      </span>
      <span className="logo-text">MoveEasy</span>
    </Link>
  );
}

const NAV = [
  { to: "/", label: "Tags", icon: <IconTag size={18} />, end: true },
  { to: "/moves", label: "Moves", icon: <IconTruck size={18} /> },
  { to: "/print", label: "Print labels", icon: <IconPrinter size={18} /> },
];

export function Layout({ userMenu }: { userMenu?: ReactNode }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);
  return (
    <div className="app">
      <a href="#main" className="skip-link">Skip to content</a>
      <header className="topbar">
        <div className="topbar-inner">
          <Logo />
          <button
            type="button"
            className="btn btn-ghost icon-btn menu-toggle"
            aria-expanded={open}
            aria-controls="main-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <IconX /> : <IconMenu />}
          </button>
          <nav id="main-nav" className={`nav ${open ? "nav-open" : ""}`} aria-label="Main">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.end} className="nav-link">
                {n.icon}
                {n.label}
              </NavLink>
            ))}
            <div className="nav-user">{userMenu}</div>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}
