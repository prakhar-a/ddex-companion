/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dbs-red': '#DA291C',
        'dbs-dark': '#1a1a1a',
        'dbs-surface': '#111111',
        'dbs-border': '#2a2a2a',
        'dbs-muted': '#6b7280',
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
