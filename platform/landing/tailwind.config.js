/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fef3f2',
          100: '#fee4e2',
          200: '#fececa',
          300: '#fcada7',
          400: '#f87c72',
          500: '#ef5144',
          600: '#db3327',
          700: '#b8271d',
          800: '#98241b',
          900: '#7d231c',
        },
      },
    },
  },
  plugins: [],
}
