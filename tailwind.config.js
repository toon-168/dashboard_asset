/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        pea: {
          purple: '#6C248C',
          'purple-dark': '#5a1e75',
        }
      },
      fontFamily: {
        sarabun: ['Sarabun', 'sans-serif'],
        inter: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
