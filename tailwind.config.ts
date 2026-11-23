import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        base: "#0a0a0a",
        elevated: "#1a1a1a",
        highlight: "#242424",
        muted: "#b3b3b3",
        // Чёрно-белый акцент: токен green оставлен для совместимости классов,
        // визуально это белый (bg-green → белая кнопка с чёрным текстом).
        green: {
          DEFAULT: "#ffffff",
          hover: "#d4d4d4",
        },
      },
      boxShadow: {
        lift: "0 8px 24px rgb(0 0 0 / 0.6)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
