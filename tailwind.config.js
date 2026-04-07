/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'dbs-red':       '#DA291C',
        'dbs-red-dark':  '#B82218',
        'dbs-red-light': '#FDECEA',
        'dbs-bg':        '#F7F7F7',
        'dbs-surface':   '#FFFFFF',
        'dbs-border':    '#DCDCDC',
        'dbs-border-md': '#C0C0C0',
        'dbs-text':      '#2E2E2E',
        'dbs-muted':     '#909090',
        'dbs-faint':     '#C0C0C0',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'dbs':    '0 1px 2px 1px rgba(0, 0, 0, 0.08)',
        'dbs-md': '0 2px 8px rgba(0, 0, 0, 0.12)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}
