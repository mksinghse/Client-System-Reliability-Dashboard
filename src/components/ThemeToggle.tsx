"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const stored = window.localStorage.getItem("wdts.theme");
    const sysDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next = stored === "dark" || stored === "light" ? stored : sysDark ? "dark" : "light";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    document.documentElement.setAttribute("data-theme-set", "wdts-deepred-contrast");
    document.documentElement.setAttribute("data-brand-token", "teal");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("wdts.theme", next);
    document.documentElement.setAttribute("data-theme", next);
  }

  return (
    <button type="button" onClick={toggle} aria-label="Toggle theme">
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span style={{ marginLeft: 6 }}>{theme === "dark" ? "Light" : "Dark"}</span>
    </button>
  );
}
