"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("mountlift-theme");
    const nextTheme = savedTheme === "dark" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("mountlift-theme", theme);
  }, [theme]);

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className={`inline-flex items-center gap-2 rounded-full border border-line/20 bg-charcoal/80 ${iconOnly ? "p-2" : "px-2.5 py-1.5"} text-[10px] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:border-gold/40 hover:text-gold`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <SunMedium size={12} /> : <MoonStar size={12} />}
      {!iconOnly && (isDark ? "Light" : "Dark")}
    </button>
  );
}
