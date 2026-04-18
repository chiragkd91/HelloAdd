/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx,css}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6845ab",
          hover: "#553891",
          foreground: "#ffffff",
        },
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
      },
      fontSize: {
        display: ["4.375rem", { lineHeight: "1.1", fontWeight: "600" }],
        section: ["1.75rem", { lineHeight: "1.2", fontWeight: "700", letterSpacing: "-0.075em" }],
        body: ["1rem", { lineHeight: "1.4", fontWeight: "400" }],
        "caption-bold": ["0.875rem", { lineHeight: "1.4", fontWeight: "700" }],
        small: ["0.75rem", { lineHeight: "1.5", fontWeight: "500" }],
        nav: ["0.875rem", { lineHeight: "1.4", fontWeight: "500" }],
      },
      borderRadius: {
        btn: "16px",
        card: "20px",
        section: "40px",
      },
      boxShadow: {
        focus: "0 0 0 2px rgba(67, 94, 229, 0.3)",
      },
    },
  },
  plugins: [],
};
