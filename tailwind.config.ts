import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#121212",
        elevated: "#181818",
        highlight: "#282828",
        muted: "#b3b3b3",
        green: {
          DEFAULT: "#1DB954",
          hover: "#1ed760",
        },
      },
      boxShadow: {
        lift: "0 8px 24px rgb(0 0 0 / 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
