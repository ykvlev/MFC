import type { Config } from 'tailwindcss';

/** Дизайн-система РСО — см. docs/architecture.md. Плоские цвета, без теней. */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#0804FF',
          bright: '#5552FF',
          tint: '#E1E0FF',
          deep: '#0040CB',
        },
        ink: '#000000',
        paper: '#FFFFFF',
        grey: '#EEEEEE',
        surface: { muted: '#F5F5F5', footer: '#F9F9F9' },
        line: { DEFAULT: '#CCCCCC', hairline: '#A8A8A8' },
        muted: '#818C99',
        dim: '#99A2AD',
        alert: '#F23838',
        warn: { bg: '#FFE9CC', fg: '#8A4B00' },
      },
      borderRadius: { card: '32px', pill: '20px', icon: '16px' },
      fontFamily: {
        title: ['"Actay Wide"', 'system-ui', 'sans-serif'],
        heading: ['Stolzl', 'system-ui', 'sans-serif'],
        num: ['"Stolzl Light"', 'Stolzl', 'system-ui', 'sans-serif'],
        sans: ['Onest', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: { rso: 'cubic-bezier(0.22, 0.61, 0.36, 1)' },
    },
  },
  plugins: [],
} satisfies Config;
