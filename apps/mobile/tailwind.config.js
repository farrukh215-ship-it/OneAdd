/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require('nativewind/preset')],
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}', './lib/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#F0F2F5',
        white: '#FFFFFF',
        ink: '#1C1E21',
        ink2: '#65676B',
        ink3: '#BEC3C9',
        border: '#E4E6EB',
        red: '#E53935',
        redDark: '#C62828',
        green: '#2E7D32',
      },
      boxShadow: {
        sm: '0 2px 8px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
};
