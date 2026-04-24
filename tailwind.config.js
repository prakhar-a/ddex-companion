/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dbs-red':       '#6B8B9A',
        'dbs-red-dark':  '#506B78',
        'dbs-red-light': '#EBF1F4',
        'dbs-bg':        '#F4F7F8',
        'dbs-surface':   '#FFFFFF',
        'dbs-border':    '#DDE4E8',
        'dbs-border-md': '#C5CDD2',
        'dbs-text':      '#1C2B33',
        'dbs-muted':     '#718794',
        'dbs-faint':     '#B0BFC6',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'dbs':    '0 1px 2px 1px rgba(0, 0, 0, 0.06)',
        'dbs-md': '0 2px 8px rgba(0, 0, 0, 0.10)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}
