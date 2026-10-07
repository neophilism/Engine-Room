"use client";

import React, { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { dashboardRoutes } from "../lib/navigation";

type AppShellProps = {
  children: React.ReactNode;
};

type IconName =
  | "home"
  | "projects"
  | "finance"
  | "users"
  | "operations"
  | "releases"
  | "alerts"
  | "about"
  | "settings";

const routeIcons: Record<string, IconName> = {
  "/": "home",
  "/projects": "projects",
  "/finance": "finance",
  "/users": "users",
  "/operations": "operations",
  "/releases": "releases",
  "/alerts": "alerts",
  "/about": "about",
  "/settings": "settings"
};

function RouteIcon({ name }: { name: IconName }) {
  const common = {
    width: 20,
    height: 20,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (name === "home") return <svg {...common}><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M9.5 20v-6h5v6"/></svg>;
  if (name === "projects") return <svg {...common}><rect x="3.5" y="4" width="7" height="7" rx="1"/><rect x="13.5" y="4" width="7" height="7" rx="1"/><rect x="3.5" y="14" width="7" height="6" rx="1"/><rect x="13.5" y="14" width="7" height="6" rx="1"/></svg>;
  if (name === "finance") return <svg {...common}><path d="M4 19V9"/><path d="M10 19V5"/><path d="M16 19v-7"/><path d="M22 19V8"/><path d="M3 19h20"/></svg>;
  if (name === "users") return <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3.5 19c.6-4 2.4-6 5.5-6s4.9 2 5.5 6"/><circle cx="17.5" cy="9" r="2.2"/><path d="M15.5 14c2.8-.3 4.6 1.3 5 4"/></svg>;
  if (name === "operations") return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>;
  if (name === "releases") return <svg {...common}><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 20h14"/></svg>;
  if (name === "alerts") return <svg {...common}><path d="M12 3 2.8 20h18.4L12 3Z"/><path d="M12 9v5"/><path d="M12 17.2h.01"/></svg>;
  if (name === "about") return <svg {...common}><circle cx="12" cy="12" r="9"/><path d="M12 11v6"/><path d="M12 7h.01"/></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/></svg>;
}

function routeIsActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function Navigation({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="app-navigation" aria-label="Primary navigation">
      {dashboardRoutes.map((route) => {
        const active = routeIsActive(pathname, route.href);
        return (
          <Link
            className={`app-nav-link${active ? " active" : ""}`}
            href={route.href}
            key={route.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            title={route.label}
          >
            <span className="app-nav-icon">
              <RouteIcon name={routeIcons[route.href] ?? "settings"} />
            </span>
            <span className="app-nav-label">{route.label}</span>
            <span className="app-nav-lamp" aria-hidden="true" />
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerId = useId();
  const currentRoute = dashboardRoutes.find((route) => routeIsActive(pathname, route.href));

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  return (
    <div className="app-shell">
      <aside className="app-sidebar">
        <Link className="app-brand" href="/" aria-label="Engine Room portfolio overview">
          <span className="app-brand-mark" aria-hidden="true">
            <span className="app-brand-coil" />
          </span>
          <span>
            <strong>ENGINE ROOM</strong>
            <small>Software Portfolio</small>
          </span>
        </Link>

        <Navigation pathname={pathname} />

        <div className="app-sidebar-footer">
          <span className="system-light" aria-hidden="true" />
          <span>
            <strong>CONTROL BUS</strong>
            <small>Architecture online</small>
          </span>
        </div>
      </aside>

      <div className="app-frame">
        <header className="app-topbar">
          <div className="app-topbar-leading">
            <button
              className="mobile-menu-button"
              type="button"
              aria-expanded={drawerOpen}
              aria-controls={drawerId}
              aria-label={drawerOpen ? "Close navigation" : "Open navigation"}
              onClick={() => setDrawerOpen((open) => !open)}
            >
              <span aria-hidden="true">{drawerOpen ? "×" : "☰"}</span>
            </button>

            <div className="route-readout">
              <span className="route-readout-label">Portfolio control</span>
              <strong>{currentRoute?.label ?? "Engine Room"}</strong>
            </div>
          </div>

          <div className="app-topbar-center" role="search">
            <span className="search-symbol" aria-hidden="true">⌕</span>
            <input
              aria-label="Search Engine Room"
              className="global-search"
              placeholder="Search projects, releases, users…"
              type="search"
            />
            <kbd>⌘ K</kbd>
          </div>

          <div className="app-topbar-actions">
            <div className="live-readout" aria-label="Portfolio data status">
              <span className="system-light" aria-hidden="true" />
              <span>
                <small>DATA BUS</small>
                <strong>Live-ready</strong>
              </span>
            </div>
            <button className="topbar-icon-button" type="button" aria-label="Notifications">
              <span aria-hidden="true">♢</span>
            </button>
            <button className="profile-control" type="button" aria-label="Open account menu">
              <span className="profile-monogram" aria-hidden="true">ER</span>
              <span className="profile-copy">
                <strong>Executive</strong>
                <small>Portfolio Admin</small>
              </span>
            </button>
          </div>
        </header>

        <div className="app-page">{children}</div>
      </div>

      <div
        className={`mobile-drawer-layer${drawerOpen ? " open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <button
          className="mobile-drawer-scrim"
          type="button"
          tabIndex={drawerOpen ? 0 : -1}
          aria-label="Close navigation"
          onClick={() => setDrawerOpen(false)}
        />
        <aside
          className="mobile-drawer"
          id={drawerId}
          aria-label="Mobile navigation"
        >
          <div className="mobile-drawer-heading">
            <span>
              <strong>ENGINE ROOM</strong>
              <small>Portfolio navigation</small>
            </span>
            <button
              className="drawer-close-button"
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawerOpen(false)}
            >
              ×
            </button>
          </div>
          <Navigation pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          <div className="mobile-drawer-status">
            <span className="system-light" aria-hidden="true" />
            <span>Control bus online</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
