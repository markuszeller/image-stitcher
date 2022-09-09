/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{html,js}"],
  theme: {
    extend: {},
    container: {
      center: true,
    },
  },
  plugins: [require("daisyui")],
  // daisyUI config (optional)
  daisyui: {
    styled: true,
    themes: true,
    base: true,
    utils: true,
    logs: true,
    rtl: false,
    prefix: "",
    darkTheme: "dark",
  },
}
