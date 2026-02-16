import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FFD700", // 金色/星星色
        secondary: "#4F46E5", // 靛蓝/冷静专业
        success: "#10B981", // 绿色/正面行为
        warning: "#F59E0B", // 橙色/提醒
        danger: "#EF4444", // 红色/扣分
        background: "#5b6abf", // Periwinkle blue
        surface: "#6b72c8", // Card/modal backgrounds
        "surface-light": "#7b7ed0", // Lighter surface variant
        // Starry Night Theme Colors
        night: {
          deep: "#0f172a", // Deep Night Blue (darkest)
          swirl: "#1e3a5f", // Swirl Blue (medium)
          bright: "#2563eb", // Bright Blue (accents)
          cosmic: "#312e81", // Cosmic Purple (hints)
        },
        star: {
          gold: "#FFD700", // Golden Star
          glow: "#FEF08A", // Star Glow (soft yellow)
          warm: "#FBBF24", // Warm Star (amber)
        },
      },
    },
  },
  plugins: [],
};

export default config;
