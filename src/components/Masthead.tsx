"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Theme = "light" | "dark";

export default function Masthead() {
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("marksheet.theme");
    if (stored === "dark" || stored === "light") {
      setTheme(stored);
      return;
    }
    setTheme(window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  }, []);

  const flip = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("marksheet.theme", next);
    } catch {
      /* private browsing — the choice just will not stick */
    }
  };

  return (
    <header className="masthead">
      <div className="masthead-in">
        <Link className="brand" href="/">
          <span className="brand-bubble" aria-hidden="true" />
          <span className="brand-name">Marksheet</span>
        </Link>

        <div className="masthead-right">
          <nav className="masthead-nav" aria-label="Main">
            <Link href="/">New sheet</Link>
            <Link href="/mine">My sheets</Link>
          </nav>
          <button className="theme-toggle" type="button" onClick={flip}>
            {theme === "dark" ? "Light" : "Dark"}
            <span className="sr-only"> theme</span>
          </button>
        </div>
      </div>
    </header>
  );
}
