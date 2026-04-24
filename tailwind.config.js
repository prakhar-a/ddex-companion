/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        'apa-red':       '#6B8B9A',
        'apa-red-dark':  '#506B78',
        'apa-red-light': '#EBF1F4',
        'apa-bg':        '#F4F7F8',
        'apa-surface':   '#FFFFFF',
        'apa-border':    '#DDE4E8',
        'apa-border-md': '#C5CDD2',
        'apa-text':      '#1C2B33',
        'apa-muted':     '#718794',
        'apa-faint':     '#B0BFC6',
      },
      fontFamily: {
        sans: ['Open Sans', 'sans-serif'],
        serif: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        'apa':    '0 1px 2px 1px rgba(0, 0, 0, 0.06)',
        'apa-md': '0 2px 8px rgba(0, 0, 0, 0.10)',
      },
      borderRadius: {
        DEFAULT: '4px',
      },
    },
  },
  plugins: [],
}
