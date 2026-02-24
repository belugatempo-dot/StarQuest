import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Segoe UI",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        mono: ["SF Mono", "Fira Code", "JetBrains Mono", "monospace"],
      },
      colors: {
        primary: "#FFD700", // Gold accent (spec §3)
        secondary: "#4F46E5", // Indigo 600 (spec §3)
        success: "#10B981", // Emerald 500 — approved / database
        warning: "#F59E0B", // Amber 500 — violation / credit
        danger: "#EF4444", // Red 500 — duty / deduction
        background: "#5b6abf", // Periwinkle blue (legacy)
        surface: "#6b72c8", // Card/modal backgrounds (legacy)
        "surface-light": "#7b7ed0", // Lighter surface variant (legacy)
        // Starry Night Theme (spec §2-3)
        night: {
          deep: "#0f172a", // Background base (Slate 900)
          swirl: "#1e3a5f", // Gradient start
          bright: "#2563eb", // Bright Blue accents
          cosmic: "#312e81", // Gradient mid (Indigo 900)
        },
        star: {
          gold: "#FFD700", // Golden Star
          glow: "#FEF08A", // Star Glow (soft yellow)
          warm: "#FBBF24", // Warm Star (amber)
          twinkle: "#FFD43B", // Bright twinkling star
        },
        // Architecture node border colors (spec §3)
        node: {
          frontend: "#00D4FF", // Cyan
          backend: "#FF6B9D", // Pink
          database: "#51CF66", // Light green
          auth: "#C39EFF", // Lavender
          external: "#FFD43B", // Bright gold
          analytics: "#8888AA", // Grey-purple
        },
      },
      borderRadius: {
        card: "14px", // Main cards (spec §7)
        hero: "20px", // Hero section
      },
      animation: {
        twinkle: "twinkle 3s ease-in-out infinite alternate",
        "twinkle-slow": "twinkle 5s ease-in-out infinite alternate",
        "twinkle-fast": "twinkle 2s ease-in-out infinite alternate",
        "fade-in": "fadeIn 0.4s ease",
        "slide-down": "slideDown 0.3s ease",
        "row-insert": "rowInsert 0.5s ease",
        "gold-flash": "goldFlash 1.5s ease",
        "float-up": "floatUp 6s linear infinite",
        "flow-dash": "flowDash 1.5s linear infinite",
        "cosmic-shimmer": "cosmicShimmer 3s linear infinite",
      },
      keyframes: {
        twinkle: {
          "0%": { opacity: "0.2", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1.2)" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        rowInsert: {
          "0%": { opacity: "0", transform: "translateX(-30px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        goldFlash: {
          "0%": { backgroundColor: "transparent" },
          "50%": { backgroundColor: "rgba(255, 215, 0, 0.3)" },
          "100%": { backgroundColor: "transparent" },
        },
        floatUp: {
          "0%": { transform: "translateY(0) rotate(0deg)", opacity: "0.7" },
          "100%": {
            transform: "translateY(-120vh) rotate(360deg)",
            opacity: "0",
          },
        },
        flowDash: {
          "0%": { strokeDashoffset: "24" },
          "100%": { strokeDashoffset: "0" },
        },
        cosmicShimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
          "100%": { backgroundPosition: "0% 50%" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
