/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Cultural heritage-inspired palette
        forest: {
          50: '#f0f7f0',
          100: '#d9edd9',
          200: '#b5d9b5',
          300: '#83be83',
          400: '#529952',
          500: '#2e7d32',
          600: '#1b5e20',
          700: '#145214',
          800: '#0d3d0d',
          900: '#082b08',
        },
        ivory: {
          50: '#fdfdf8',
          100: '#faf8ee',
          200: '#f5f0d5',
          300: '#ede5b5',
          400: '#e0d48e',
          500: '#d4c26a',
        },
        gold: {
          50: '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
        },
        clay: {
          50: '#fdf4f0',
          100: '#fce7df',
          200: '#f9cfc0',
          300: '#f4af99',
          400: '#ec8868',
          500: '#e05a3b',
          600: '#c44a2e',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
