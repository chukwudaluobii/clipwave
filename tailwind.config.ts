import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Clipwave brand palette
        brand: {
          50: "#eef6ff",
          100: "#d9ecff",
          200: "#bcdcff",
          300: "#8ec5ff",
          400: "#59a3ff",
          500: "#317dff",
          600: "#1a5cf5",
          700: "#1547e1",
          800: "#173bb6",
          900: "#19378f",
        },
        ink: {
          900: "#0a0e1a",
          800: "#111726",
          700: "#1b2436",
          600: "#2a3650",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
