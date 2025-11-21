/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,js,html}",
  ],
  theme: {
    extend: {
      colors: {
        aucto: {
          bg: "#f7f7f5",          // page background
          borderLight: "#e2e8f0", // separators
          borderMid: "#334155",   // inputs / buttons
          borderDark: "#1e293b",  // heavy borders
          red: "#dc2629",         // guest banner
        },
      },
      fontFamily: {
        serif: ['"Cormorant"', "serif"],
        sans: ['"Source Sans 3"', "system-ui", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
      },
    },
  },
  plugins: [],
}
