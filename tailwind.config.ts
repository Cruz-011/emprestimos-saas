/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: {
          DEFAULT: "#0A0C0F",
          soft: "#0D1014",
        },
        surface: {
          DEFAULT: "#12151B",
          hover: "#181C23",
          border: "#232830",
        },
        ink: {
          DEFAULT: "#ECEFF3",
          muted: "#8A94A3",
          faint: "#5B6472",
        },
        primary: {
          DEFAULT: "#22C58B",
          dark: "#189A6C",
          soft: "rgba(34, 197, 139, 0.12)",
        },
        danger: {
          DEFAULT: "#E5555C",
          soft: "rgba(229, 85, 92, 0.12)",
        },
        warning: {
          DEFAULT: "#E3A73B",
          soft: "rgba(227, 167, 59, 0.12)",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
      },
    },
  },
  plugins: [],
};