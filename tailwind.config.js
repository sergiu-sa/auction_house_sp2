/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,js,html}",
  ],
  theme: {
    extend: {
      colors: {
        "warm-white": "#F7F7F5",
      },
      fontFamily: {
        serif: ['"Cormorant"', "serif"],
        sans: ['"Source Sans 3"', "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
}
