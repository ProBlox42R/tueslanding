/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Брандовият цвят е фиксиран и еднакъв в светла и тъмна тема —
        // само повърхностите (surface/background/text) варират между темите.
        brand: {
          DEFAULT: "#ED6C66",
          hover: "#E05650",
          container: "#FFDAD8",
        },
      },
      borderRadius: {
        m3: "16px",
        "m3-lg": "28px",
        "m3-full": "9999px",
      },
      boxShadow: {
        "m3-1": "0 1px 2px 0 rgba(0,0,0,0.15), 0 1px 3px 1px rgba(0,0,0,0.10)",
        "m3-2": "0 1px 2px 0 rgba(0,0,0,0.20), 0 2px 6px 2px rgba(0,0,0,0.12)",
      },
    },
  },
  plugins: [],
};
