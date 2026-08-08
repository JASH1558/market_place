/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#2B2440",
        inkSoft: "#5C5470",
        cork: "#C8935B",
        corkDark: "#B37D45",
        cream: "#FBF3E7",
        yellow: "#FFD84D",
        pink: "#FF9EB7",
        mint: "#8FD9A8",
        sky: "#8FC7E8",
        lilac: "#C9B6F2",
        red: "#E4572E",
      },
      fontFamily: {
        display: ["Kalam", "cursive"],
        body: ["Nunito", "sans-serif"],
        mono: ["'Space Mono'", "monospace"],
      },
      boxShadow: {
        pin: "3px 4px 0 rgba(43,36,64,0.35)",
        card: "5px 6px 0 rgba(43,36,64,0.35)",
      },
    },
  },
  plugins: [],
};
