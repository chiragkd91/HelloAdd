/** @type {import('tailwindcss').Config} */
/**
 * Marketing site: Inter, primary purple #6845ab (unified with dashboard), hero #0A0A0A.
 * Warm neutrals kept for secondary surfaces.
 */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./styles/**/*.css",
  ],
  theme: {
    extend: {
      colors: {
        /** Unified brand primary (matches dashboard) */
        primary: {
          DEFAULT: "#6845ab",
          hover: "#553891",
          foreground: "#ffffff",
        },
        /** Part 4 hero background */
        hero: "#0A0A0A",
        /** Slightly lifted dark surface (cards on hero / dark bands) */
        "hero-elevated": "#111113",
        plum: "#211922",
        brand: {
          red: "#e60023",
          "red-hover": "#c2001e",
        },
        olive: "#62625b",
        "warm-silver": "#91918c",
        sand: "#e5e5e0",
        "warm-light": "#e0e0d9",
        fog: "#f6f6f3",
        dark: "#33332e",
        "focus-blue": "#435ee5",
        "link-blue": "#2b48d4",
        error: "#9e0a0a",
        green: {
          700: "#103c25",
          "700-hover": "#0b2819",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "Segoe UI", "Roboto", "sans-serif"],
        /** Footer “Hello Add” watermark only */
        watermark: ["var(--font-watermark)", "system-ui", "sans-serif"],
      },
      fontSize: {
        /** DESIGN.md Display Hero — 70px / 600 */
        display: ["4.375rem", { lineHeight: "1.1", fontWeight: "600" }],
        /** Section heading — 28px / 700 / -0.075em */
        section: ["1.75rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.075em" }],
        /** Body — 16px / 400 / 1.4 */
        body: ["1rem", { lineHeight: "1.4", fontWeight: "400" }],
        /** Caption bold — 14px / 700 */
        "caption-bold": ["0.875rem", { lineHeight: "1.4", fontWeight: "700" }],
        /** Small — 12px / 500 */
        small: ["0.75rem", { lineHeight: "1.5", fontWeight: "500" }],
        /** Nav / UI emphasis — 14px */
        nav: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        btn: "16px",
        card: "20px",
        section: "40px",
        pill: "9999px",
      },
      boxShadow: {
        focus: "0 0 0 2px rgba(67, 94, 229, 0.3)",
        /** Purple glow — brand only (no green) */
        brand: "0 24px 80px -12px rgba(104, 69, 171, 0.35)",
      },
      backgroundImage: {
        /** Marketing hero + CTAs — primary → hover purple */
        "gradient-brand": "linear-gradient(135deg, #6845ab 0%, #553891 100%)",
        "gradient-hero-soft":
          "radial-gradient(circle at top right, rgba(104, 69, 171, 0.14) 0%, #f6f6f3 52%)",
        "gradient-mesh-purple":
          "radial-gradient(circle at 80% 20%, rgba(104, 69, 171, 0.08) 0%, transparent 50%), radial-gradient(circle at 10% 80%, rgba(104, 69, 171, 0.06) 0%, transparent 45%)",
      },
    },
  },
  plugins: [],
};
