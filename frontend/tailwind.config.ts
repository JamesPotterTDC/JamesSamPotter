import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        void: "#07090f",
        night: {
          900: "#0d1424",
          800: "#111827",
          700: "#162032",
          600: "#1e2d45",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-space-grotesk)", "system-ui", "sans-serif"],
        bebas: ["var(--font-bebas)", "system-ui", "sans-serif"],
      },
      backgroundImage: {
        "hero-glow":
          "radial-gradient(ellipse at 15% 60%, rgba(251,146,60,0.07) 0%, transparent 55%), radial-gradient(ellipse at 85% 20%, rgba(34,211,238,0.05) 0%, transparent 50%)",
        "card-shine":
          "linear-gradient(135deg, rgba(255,255,255,0.04) 0%, transparent 60%)",
      },
      boxShadow: {
        card: "0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.07)",
        "card-hover":
          "0 4px 24px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.12)",
        "glow-orange":
          "0 0 40px rgba(251,146,60,0.18), 0 0 80px rgba(251,146,60,0.06)",
        "glow-cyan":
          "0 0 40px rgba(34,211,238,0.18), 0 0 80px rgba(34,211,238,0.06)",
        map: "0 0 0 1px rgba(255,255,255,0.08), 0 16px 48px rgba(0,0,0,0.6)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "pulse-slow": "pulse 4s ease-in-out infinite",
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(28px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
