import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        red: {
          DEFAULT: '#E53935',
          dark: '#C62828',
          light: 'rgba(229,57,53,0.1)',
        },
        green: {
          DEFAULT: '#2E7D32',
          light: 'rgba(46,125,50,0.1)',
        },
        ink: {
          DEFAULT: '#1C1E21',
          2: '#65676B',
          3: '#BEC3C9',
        },
        bg: '#F0F2F5',
        border: '#E4E6EB',
      },
      fontFamily: {
        sans: ['var(--font-outfit)', 'sans-serif'],
      },
      borderRadius: {
        card: '12px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08)',
        card2: '0 4px 16px rgba(0,0,0,0.12)',
      },
    },
  },
};

export default config;
