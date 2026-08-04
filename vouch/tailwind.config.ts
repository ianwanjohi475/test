import type { Config } from "tailwindcss";

// Design system: "Reputation, earned."
// Brand tokens are declared as CSS variables in globals.css and mapped here so
// components read as `bg-evergreen` / `text-ink` rather than raw hex.
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "var(--ink)",
        paper: "var(--paper)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        evergreen: {
          DEFAULT: "var(--evergreen)",
          hover: "var(--evergreen-hover)",
        },
        gold: {
          DEFAULT: "var(--gold)",
          soft: "var(--gold-soft)",
        },
        danger: "var(--danger)",
        success: "var(--success)",
        // Focus ring
        ring: "var(--evergreen)",
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "var(--font-inter)", "sans-serif"],
      },
      fontSize: {
        // Intentional type scale: 12 / 14 / 16 / 20 / 28 / 40
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.25rem", { lineHeight: "1.75rem" }],
        xl: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.01em" }],
        "2xl": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em" }],
      },
      borderRadius: {
        DEFAULT: "10px",
        lg: "10px",
        md: "8px",
        sm: "6px",
      },
      boxShadow: {
        // One shadow token, subtle.
        card: "0 1px 2px rgba(20, 37, 30, 0.04), 0 4px 16px rgba(20, 37, 30, 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
