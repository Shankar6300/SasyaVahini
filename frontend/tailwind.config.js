/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#07875B',
          dark: '#065c3e',
          light: '#09a970',
          bg: '#E8F5E9',
        },
      },
    },
  },
  plugins: [],
}

