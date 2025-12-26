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
        background: "#F9FAFB", // 浅灰白
      },
    },
  },
  plugins: [],
};

export default config;
