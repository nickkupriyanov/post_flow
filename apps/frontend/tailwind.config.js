/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2b2526",
        cream: "#fffaf3",
        coral: "#d9534f"
      },
      fontFamily: {
        display: ["Fraunces", "Georgia", "serif"],
        body: ["Manrope", "Arial", "sans-serif"]
      }
    }
  },
  plugins: []
};

