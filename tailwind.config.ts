import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--color-ink)",
        paper: "var(--color-paper)",
        charcoal: "var(--color-charcoal)",
        gold: "var(--color-gold)",
        line: "var(--color-line)",
        muted: "var(--color-muted)",
        panel: "var(--color-panel)",
        lift: "var(--color-gold)", // alias for compatibility
        amber: "var(--color-gold)", // alias for compatibility
        viz: {
          gold: "#CC9A3D",
          teal: "#3F6B62",
          rose: "#B15C67",
          slate: "#52657A",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "monospace"],
        display: ["var(--font-display)", "var(--font-sans)", "ui-sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
