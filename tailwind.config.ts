import type { Config } from "tailwindcss"
import tailwindcssAnimate from "tailwindcss-animate"
import plugin from "tailwindcss/plugin"

const config: Config = {
  darkMode: ["class"],
  // `hover:` only where there is a mouse: on touch screens a tapped button kept its hover colour until the next tap
  future: { hoverOnlyWhenSupported: true },
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-roboto)", "Roboto", "Arial", "Noto Sans Bengali", "Nirmala UI", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [
    tailwindcssAnimate,
    plugin(({ addVariant }) => {
      // Devices with a mouse. Hover-only controls use it (`can-hover:opacity-0 can-hover:group-hover:opacity-100`),
      // so on touch screens, which can't hover, they stay visible
      addVariant("can-hover", "@media (hover: hover) and (pointer: fine)")
      // The visitor is using the keyboard (Tab; html[data-keyboard], set in app/layout.tsx). For anything a click must
      // not leave behind, such as a hover-only button staying visible because its menu gave the focus back
      addVariant("kb", "html[data-keyboard] &")
      // Short phone screens (e.g. iPhone SE), where tall overlays need to be more compact
      addVariant("short-screen", "@media (max-width: 1023px) and (max-height: 680px)")
      // Phones held sideways, and windows as low: nothing may be taller than what shows. (Comes before md: and lg: in
      // the CSS, so against those it needs `low:!...`)
      addVariant("low", "@media (orientation: landscape) and (max-height: 560px)")
    }),
  ],
}

export default config
