/** @type {import('tailwindcss').Config} */
import trac from "tailwindcss-react-aria-components";
import contQueries from "@tailwindcss/container-queries";

export default {
  content: ["./index.html", "./download.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    fontSize: {
      xs: "0.4rem",
    },
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui"],
      },
      colors: {
        primary: "#3f8946",
        "primary-content": "#f4f7f5",
        secondary: "#0cce61",
        accent: "#0bcb54",
        "base-content": "#dadde1",
        "base-100": "#242729",
        "base-200": "#1b1d1e",
        "base-300": "#161819",
      },
    },

    fontFamily: {
      keycap: ["Inter", "system-ui"],
    },
  },
  plugins: [contQueries, trac({ prefix: "rac" })],
};
