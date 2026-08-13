/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Primary: calm slate-blue (clinical, not neon)
        brand: {
          50:  '#f0f4f8',
          100: '#d9e2ec',
          200: '#bcccdc',
          300: '#9fb3c8',
          400: '#829ab1',
          500: '#627d98',
          600: '#486581',
          700: '#334e68',
          800: '#243b53',
          900: '#102a43',
        },
        // Accent: muted teal (calm, readable)
        accent: {
          100: '#e0f2f1',
          300: '#80cbc4',
          500: '#26a69a',
          700: '#00796b',
        },
        // Status colours — muted, not neon
        positive: '#2d7d46',
        caution:  '#b45309',
        neutral:  '#4b5563',
        // Surface colours
        surface:  '#f8fafc',
        border:   '#e2e8f0',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
    },
  },
  plugins: [],
}
