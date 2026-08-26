/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      colors: {
        primary: {
          50: '#eef4fb',
          100: '#d9e6f5',
          200: '#b3cde9',
          300: '#84abd8',
          400: '#5487c2',
          500: '#356aa9',
          600: '#26538a',
          700: '#1f4570',
          800: '#0f3d6e',
          900: '#0c2f55',
          950: '#081f39',
        },
        accent: {
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
        },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,.06), 0 1px 3px rgba(16,24,40,.1)',
        pop: '0 10px 30px rgba(12,31,57,.18)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
    },
  },
  plugins: [],
};
