"use client";

import UserMenu from "@/components/UserMenu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const NAV = [
  { href: "/quizzes", label: "Quizzes" },
  { href: "/ai", label: "Use AI" },
];

export default function Masthead() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Following a link should put the menu away.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string) => (pathname === href ? "page" : undefined);

  return (
    <header className="masthead">
      <div className="masthead-in">
        <Link className="brand" href="/">
          <span className="brand-bubble" aria-hidden="true" />
          <span className="brand-name">Marksheet</span>
        </Link>

        {/* Wide screens: everything on one line. */}
        <div className="masthead-right">
          <nav className="masthead-nav" aria-label="Main">
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} aria-current={current(item.href)}>
                {item.label}
              </Link>
            ))}
          </nav>
          <UserMenu />
        </div>

        {/* Narrow screens: the avatar stays reachable, the rest folds away. */}
        <div className="masthead-compact">
          <UserMenu compact />
          <button
            className="nav-toggle"
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <span className="sr-only">{open ? "Close menu" : "Open menu"}</span>
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              <path
                d={open ? "M5 5l10 10M15 5L5 15" : "M3 6h14M3 10h14M3 14h14"}
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                fill="none"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="nav-panel" id="mobile-nav" hidden={!open}>
        <nav aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              className="nav-panel-link"
              href={item.href}
              aria-current={current(item.href)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
