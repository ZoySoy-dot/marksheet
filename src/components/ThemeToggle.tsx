"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

/**
 * Lives in the footer rather than the header. It is a preference you set once,
 * not a thing you reach for, so it does not deserve top-level space.
 */
export default function ThemeToggle() {
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
      /* private browsing, so the choice just will not stick */
    }
  };

  return (
    <button className="theme-toggle" type="button" onClick={flip}>
      {theme === "dark" ? "Light" : "Dark"}
      <span className="sr-only"> theme</span>
    </button>
  );
}
