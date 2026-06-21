import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand
        gold: {
          DEFAULT: '#ffd700',
          light:   '#ffe033',
          dark:    '#e6c200',
        },
        // Surface scale (values updated to new design system)
        surface: {
          200: '#e0e0e0',
          300: '#c0c0c0',
          400: '#a0a0a0',
          500: '#606060',
          600: '#2c2c2c',
          700: '#1c1c1c',
          800: '#141414',
          900: '#0a0a0a',
        },
        // Edition colors
        edition: {
          ghana:     '#ffd700',
          global:    '#00bf63',
          spicy:     '#ff3131',
          complete:  '#e8e8e8',
          christian: '#8c52ff',
        },
        // WhatsApp
        wa: '#25D366',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in':  'fadeIn 0.15s ease-out',
        'slide-up': 'slideUp 0.2s ease-out',
        'sheet-in': 'sheetIn 0.32s cubic-bezier(0.32,0.72,0,1)',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(6px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        sheetIn: { '0%': { transform: 'translateY(100%)' }, '100%': { transform: 'translateY(0)' } },
      },
    },
  },
  plugins: [],
}

export default config
