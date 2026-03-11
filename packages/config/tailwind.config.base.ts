import type { Config } from "tailwindcss";

export const baseConfig: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        red: { DEFAULT: "#E53935", dark: "#C62828", light: "rgba(229,57,53,0.1)" },
        green: { DEFAULT: "#2E7D32", light: "rgba(46,125,50,0.1)" },
        ink: { DEFAULT: "#1C1E21", 60: "#65676B", 30: "#BEC3C9", 8: "rgba(28,30,33,0.08)" },
        bg: "#F0F2F5",
        border: "#E4E6EB"
      },
      fontFamily: {
        sans: ["Outfit", "sans-serif"]
      },
      borderRadius: {
        card: "12px"
      },
      boxShadow: {
        card: "0 2px 8px rgba(0,0,0,0.08)",
        card2: "0 4px 16px rgba(0,0,0,0.12)"
      }
    }
  }
};
