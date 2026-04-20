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
        bg: {
          primary: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
          hover: "#1e1e1e",
        },
        border: {
          primary: "#2a2a2a",
          secondary: "#222222",
          focus: "#8b5cf6",
        },
        purple: {
          DEFAULT: "#8b5cf6",
          light: "#a78bfa",
          dark: "#7c3aed",
          glow: "rgba(139,92,246,0.4)",
        },
        text: {
          primary: "#e0e0e0",
          secondary: "#aaaaaa",
          muted: "#666666",
          dim: "#444444",
        },
      },
      keyframes: {
        pulse_glow: {
          "0%, 100%": { boxShadow: "0 0 0 2px rgba(139,92,246,0.2), 0 0 12px rgba(139,92,246,0.15)" },
          "50%": { boxShadow: "0 0 0 3px rgba(139,92,246,0.5), 0 0 28px rgba(139,92,246,0.35)" },
        },
        spin_slow: {
          to: { transform: "rotate(360deg)" },
        },
        slide_in: {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        fade_in: {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
      },
      animation: {
        pulse_glow: "pulse_glow 1.5s ease-in-out infinite",
        spin_slow: "spin_slow 0.8s linear infinite",
        slide_in: "slide_in 0.2s ease-out",
        fade_in: "fade_in 0.2s ease-out",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
