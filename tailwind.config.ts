import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta "cartucho": grises oscuros con acentos de la Pokedex clasica.
        ink: {
          900: '#0d0f10',
          800: '#141719',
          700: '#1c2124',
          600: '#262c30',
          500: '#39434a',
          400: '#5a666e',
        },
        bone: '#e9e6d8',
        dex: {
          red: '#d0342c',
          darkred: '#8f211c',
          blue: '#2a75bb',
          yellow: '#ffcb05',
          green: '#3fa129',
        },
        screen: {
          bg: '#9bbc0f',
          mid: '#8bac0f',
          dark: '#306230',
          ink: '#0f380f',
        },
      },
      fontFamily: {
        pixel: ['var(--font-pixel)', 'monospace'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        hard: '4px 4px 0 0 rgba(0,0,0,0.85)',
        'hard-sm': '2px 2px 0 0 rgba(0,0,0,0.85)',
        'hard-lg': '6px 6px 0 0 rgba(0,0,0,0.85)',
        inset: 'inset 0 0 0 2px rgba(0,0,0,0.35)',
      },
      keyframes: {
        blink: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.25' } },
        'pixel-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        blink: 'blink 1s steps(2, start) infinite',
        'pixel-in': 'pixel-in 180ms steps(4, end)',
      },
    },
  },
  plugins: [],
};

export default config;
