// tailwind.config.ts
import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      /* Industry-Standard Color System */
      colors: {
        /* Core System Colors */
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        
        /* Enhanced Color Tokens */
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          hover: "hsl(var(--primary-hover))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
          hover: "hsl(var(--secondary-hover))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
          hover: "hsl(var(--accent-hover))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
          hover: "hsl(var(--muted-hover))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
          border: "hsl(var(--card-border))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        
        /* Semantic Colors */
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
          light: "hsl(var(--success-light))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
          light: "hsl(var(--warning-light))",
        },
        error: {
          DEFAULT: "hsl(var(--error))",
          foreground: "hsl(var(--error-light))",
          light: "hsl(var(--error-light))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-light))",
          light: "hsl(var(--info-light))",
        },
        
        /* Neutral Scale */
        neutral: {
          50: "hsl(var(--neutral-50))",
          100: "hsl(var(--neutral-100))",
          200: "hsl(var(--neutral-200))",
          300: "hsl(var(--neutral-300))",
          400: "hsl(var(--neutral-400))",
          500: "hsl(var(--neutral-500))",
          600: "hsl(var(--neutral-600))",
          700: "hsl(var(--neutral-700))",
          800: "hsl(var(--neutral-800))",
          900: "hsl(var(--neutral-900))",
        },
        
        /* Brand Colors */
        brand: {
          primary: "hsl(var(--brand-primary))",
          secondary: "hsl(var(--brand-secondary))",
          light: "hsl(var(--brand-light))",
          dark: "hsl(var(--brand-dark))",
          medium: "hsl(var(--brand-medium))",
        },
      },

      /* Advanced Typography */
      fontFamily: {
        sans: ['DM Sans', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
        handwriting: ['Georgia', 'serif'], // For handwriting-style accent text (matching marketing site)
      },
      fontSize: {
        xs: ['var(--font-size-xs)', { lineHeight: 'var(--leading-tight)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--leading-snug)' }],
        base: ['var(--font-size-base)', { lineHeight: 'var(--leading-normal)' }],
        lg: ['var(--font-size-lg)', { lineHeight: 'var(--leading-normal)' }],
        xl: ['var(--font-size-xl)', { lineHeight: 'var(--leading-snug)' }],
        '2xl': ['var(--font-size-2xl)', { lineHeight: 'var(--leading-snug)' }],
        '3xl': ['var(--font-size-3xl)', { lineHeight: 'var(--leading-tight)' }],
        '4xl': ['var(--font-size-4xl)', { lineHeight: 'var(--leading-tight)' }],
        '5xl': ['var(--font-size-5xl)', { lineHeight: 'var(--leading-tight)' }],
        '6xl': ['var(--font-size-6xl)', { lineHeight: 'var(--leading-tight)' }],
      },

      /* Enhanced Border Radius */
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        "2xl": "var(--radius-2xl)",
        "3xl": "var(--radius-3xl)",
        DEFAULT: "var(--radius)",
      },

      /* Professional Animation System */
      keyframes: {
        /* Accordion Animations */
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" }
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" }
        },
        
        /* Fade Animations */
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        "fade-out": {
          "0%": { opacity: "1", transform: "translateY(0)" },
          "100%": { opacity: "0", transform: "translateY(10px)" }
        },
        
        /* Scale Animations */
        "scale-in": {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        
        /* Slide Animations */
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "slide-in-left": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-left": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-100%)" }
        },
        "slide-in-up": {
          "0%": { transform: "translateY(100%)" },
          "100%": { transform: "translateY(0)" }
        },
        "slide-out-down": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(100%)" }
        },
        
        /* Bounce Animation */
        "bounce-subtle": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" }
        },
        
        /* Pulse Animation */
        "pulse-subtle": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.8" }
        },
        
        /* Spin Variations */
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" }
        },
        
        /* Shimmer Effect */
        "shimmer": {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(100%)" }
        }
      },

      animation: {
        /* Basic Animations */
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out",
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-in-left": "slide-in-left 0.3s ease-out",
        "slide-out-left": "slide-out-left 0.3s ease-out",
        "slide-in-up": "slide-in-up 0.3s ease-out",
        "slide-out-down": "slide-out-down 0.3s ease-out",
        
        /* Enhanced Animations */
        "bounce-subtle": "bounce-subtle 2s ease-in-out infinite",
        "pulse-subtle": "pulse-subtle 2s ease-in-out infinite",
        "spin-slow": "spin-slow 3s linear infinite",
        "shimmer": "shimmer 2s linear infinite",
        
        /* Combined Animations */
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out"
      },

      /* Industry-Grade Shadow System */
      boxShadow: {
        /* Standard Shadows */
        xs: "var(--shadow-xs)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        "2xl": "var(--shadow-2xl)",
        inner: "var(--shadow-inner)",
        
        /* Brand Shadows */
        soft: "var(--shadow-soft)",
        medium: "var(--shadow-medium)",
        strong: "var(--shadow-strong)",
        brand: "var(--shadow-brand)",
        glow: "var(--shadow-glow)",
        
        /* Legacy Support */
        elegant: "var(--shadow-strong)",
      },

      /* Premium Gradient System */
      backgroundImage: {
        "gradient-primary": "var(--gradient-primary)",
        "gradient-hero": "var(--gradient-hero)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-card": "var(--gradient-card)",
        "gradient-surface": "var(--gradient-surface)",
        "gradient-subtle": "var(--gradient-subtle)",
      },

      /* Advanced Transitions */
      transitionProperty: {
        smooth: "var(--transition-smooth)",
        fast: "var(--transition-fast)",
        slow: "var(--transition-slow)",
        bounce: "var(--transition-bounce)",
        spring: "var(--transition-spring)",
      },
      
      transitionTimingFunction: {
        "ease-in": "var(--ease-in)",
        "ease-out": "var(--ease-out)",
        "ease-in-out": "var(--ease-in-out)",
        "ease-elastic": "var(--ease-elastic)",
      },

      /* Enhanced Spacing */
      spacing: {
        px: "var(--space-px)",
        0: "var(--space-0)",
        1: "var(--space-1)",
        2: "var(--space-2)",
        3: "var(--space-3)",
        4: "var(--space-4)",
        5: "var(--space-5)",
        6: "var(--space-6)",
        8: "var(--space-8)",
        10: "var(--space-10)",
        12: "var(--space-12)",
        16: "var(--space-16)",
        20: "var(--space-20)",
        24: "var(--space-24)",
        32: "var(--space-32)",
        
        /* Safe Area Support */
        "safe-top": "env(safe-area-inset-top, 0px)",
        "safe-bottom": "env(safe-area-inset-bottom, 0px)",
        "safe-left": "env(safe-area-inset-left, 0px)",
        "safe-right": "env(safe-area-inset-right, 0px)",
      },

      /* Backdrop Filters */
      backdropBlur: {
        xs: "blur(2px)",
        sm: "blur(4px)",
        md: "blur(8px)",
        lg: "blur(16px)",
        xl: "blur(24px)",
        "2xl": "blur(40px)",
        "3xl": "blur(64px)",
      },
    },
  },
  plugins: [
    animate,
    function({ addUtilities }) {
      addUtilities({
        /* Interactive Elements */
        ".hover-scale": {
          "@apply transition-transform duration-200 hover:scale-105": {},
        },
        ".hover-lift": {
          "@apply transition-all duration-300 hover:-translate-y-1 hover:shadow-lg": {},
        },
        ".hover-glow": {
          "@apply transition-all duration-300 hover:shadow-glow": {},
        },
        
        /* Glass Morphism */
        ".glass": {
          "@apply bg-white/80 backdrop-blur-lg border border-white/20": {},
        },
        ".glass-dark": {
          "@apply bg-neutral-800/80 backdrop-blur-lg border border-neutral-600/20": {},
        },
        
        /* Text Utilities */
        ".text-gradient": {
          "@apply bg-gradient-primary bg-clip-text text-transparent": {},
        },
        ".text-balance": {
          "text-wrap": "balance",
        },
        
        /* Focus States */
        ".focus-ring": {
          "@apply focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2": {},
        },
        
        /* Layout Utilities */
        ".container-responsive": {
          "@apply w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8": {},
        },
        
        /* Animation Delays */
        ".animate-delay-75": {
          "animation-delay": "75ms",
        },
        ".animate-delay-100": {
          "animation-delay": "100ms",
        },
        ".animate-delay-150": {
          "animation-delay": "150ms",
        },
        ".animate-delay-200": {
          "animation-delay": "200ms",
        },
        ".animate-delay-300": {
          "animation-delay": "300ms",
        },
        ".animate-delay-500": {
          "animation-delay": "500ms",
        },
        ".animate-delay-700": {
          "animation-delay": "700ms",
        },
        ".animate-delay-1000": {
          "animation-delay": "1000ms",
        },
      });
    },
  ],
};

export default config;