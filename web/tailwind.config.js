/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f3f6f4',
          100: '#e2ebe6',
          200: '#c5d6cc',
          300: '#9bb8a7',
          400: '#6f9682',
          500: '#537a66',
          600: '#40614f',
          700: '#354f41',
          800: '#2d4136',
          900: '#26372f',
        },
      },
      fontFamily: {
        serif: ['"DM Serif Display"', 'serif'],
      },
    },
  },
  plugins: [],
}
