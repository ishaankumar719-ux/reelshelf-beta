import type { Config } from "tailwindcss"

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '"Helvetica Now Display"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
        ui: [
          '"Helvetica Now Display"',
          '"Helvetica Neue"',
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      letterSpacing: {
        label: "0.06em",
        meta: "0.02em",
        ui: "0.01em",
      },
      colors: {
        rs: {
          "surface-base":     "#07070b",
          "surface-card":     "#0d0d14",
          "surface-elevated": "#131320",
          "border-subtle":    "rgba(255,255,255,0.08)",
          "border-strong":    "rgba(255,255,255,0.18)",
          "text-primary":     "rgba(255,255,255,0.92)",
          "text-secondary":   "rgba(255,255,255,0.55)",
          "text-muted":       "rgba(255,255,255,0.32)",
          "accent":           "#1d9e75",
        },
      },
      borderRadius: {
        card:   "10px",
        badge:  "5px",
        button: "9999px",
        avatar: "9999px",
      },
      fontSize: {
        display: ["clamp(22px,5vw,36px)", { lineHeight: "1.1",  fontWeight: "600" }],
        title:   ["clamp(17px,3vw,22px)", { lineHeight: "1.15", fontWeight: "500" }],
        heading: ["14px",                 { lineHeight: "1.25", fontWeight: "600" }],
        body:    ["13px",                 { lineHeight: "1.6",  fontWeight: "400" }],
        caption: ["11px",                 { lineHeight: "1.4",  fontWeight: "400" }],
        micro:   ["9px",                  { lineHeight: "1.2",  fontWeight: "600" }],
      },
    },
  },
}

export default config
