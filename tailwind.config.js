/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./login.html",
    "./register.html",
    "./listing.html",
    "./profile.html",
    "./src/**/*.{ts,js,html}",
  ],
  theme: {
    extend: {
      colors: {
        "warm-white": "#F7F7F5",
        aucto: {
          bg: "#f7f7f5",
          borderLight: "#e2e8f0",
          borderMid: "#334155",
          borderDark: "#1e293b",
          red: "#dc2629",
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
