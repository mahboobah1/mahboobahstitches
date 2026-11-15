/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        royal: { DEFAULT: "#183B63", deep: "#102A47", soft: "#2B5788" },
        powder: { DEFAULT: "#DCE5EF", deep: "#C6D3E2" },
        cream: { DEFAULT: "#F5F0E6", deep: "#EBE3D3" },
        gold: { DEFAULT: "#B69A65", deep: "#8F764A" },
      },
      fontFamily: {
        display: ['"Cormorant Garamond"', "Georgia", "serif"],
        sans: ['"Inter Variable"', "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      maxWidth: { page: "76rem" },
    },
  },
  plugins: [],
};
