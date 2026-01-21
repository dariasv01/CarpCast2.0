/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#e7f5ff',
          100: '#d0ebff',
          500: '#339af0',
          600: '#228be6',
          700: '#1c7ed6',
        },
        fishing: {
          water: '#0ea5e9',
          shore: '#a3a3a3',
          fish: '#f97316',
          bait: '#84cc16',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}