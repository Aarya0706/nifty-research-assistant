import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0D1512",
          900: "#101B17",
          800: "#16241F",
          700: "#1E322B",
          600: "#2A4139",
        },
        paper: {
          100: "#F3EFE6",
          200: "#E7E0CF",
          300: "#CFC6AE",
        },
        amber: {
          400: "#D9A441",
          500: "#C4913A",
        },
        teal: {
          400: "#5AA69B",
          500: "#468B81",
        },
        rust: {
          400: "#C1694B",
          500: "#A8563C",
        },
      },
      fontFamily: {
        serif: ["'Source Serif 4'", "ui-serif", "Georgia", "serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
        sans: ["'Inter'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      maxWidth: {
        notebook: "760px",
      },
    },
  },
  plugins: [],
};
export default config;
