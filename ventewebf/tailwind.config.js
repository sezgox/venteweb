/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
      extend: {
        colors: {
          bg: "var(--color-bg)",
          text: "var(--color-text)",
          primary: "var(--color-primary)",
          secondary: "var(--color-secondary)",
          tertiary: "var(--color-tertiary)",
          gray50: "var(--color-gray-50)",
          gray100: "var(--color-gray-100)",
          gray200: "var(--color-gray-200)",
          gray300: "var(--color-gray-300)",
          gray400: "var(--color-gray-400)",
          gray500: "var(--color-gray-500)",
          gray600: "var(--color-gray-600)",
          gray700: "var(--color-gray-700)",
          gray800: "var(--color-gray-800)",
          gray900: "var(--color-gray-900)",
        },
      },
  },
  plugins: [],
}

