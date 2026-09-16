"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useEffect, useState } from "react";

export default function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const current = (document.documentElement.dataset.theme as "dark" | "light") || "light";
    setTheme(current);
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("mountlift-theme", next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      className={`inline-flex items-center gap-2 rounded-full border border-line/20 bg-charcoal/80 ${iconOnly ? "p-2" : "px-2.5 py-1.5"} text-[10px] font-medium uppercase tracking-[0.16em] text-muted transition-colors hover:border-gold/40 hover:text-gold`}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
    >
      {isDark ? <SunMedium size={12} /> : <MoonStar size={12} />}
      {!iconOnly && (mounted ? (isDark ? "Light" : "Dark") : "Theme")}
    </button>
  );
}
