/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Indigo-based primary — precision and calm, distinct from generic sky-blue SaaS
        primary: {
          50:  '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        // Deep blue-black surfaces — has a tint that reads as intentional, not generic near-black
        ink: {
          950: '#07080f',
          900: '#0e1016',
          800: '#141720',
          700: '#1c2030',
          600: '#252a3d',
          500: '#2e3450',
        },
        // Recording accent — amber/warm for "live" state
        rec: {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        },
      },
      fontFamily: {
        // Use system sans — sharp, native to each platform
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        // Monospace for timestamps and technical data — feels precise, not decorative
        mono: ['"JetBrains Mono"', '"Fira Code"', 'Menlo', '"Cascadia Code"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },
      boxShadow: {
        'glow-primary': '0 0 20px -4px rgba(99, 102, 241, 0.3)',
        'glow-rec': '0 0 20px -4px rgba(249, 115, 22, 0.4)',
      },
      animation: {
        'pulse-rec': 'pulse-rec 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'pulse-rec': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.5', transform: 'scale(0.92)' },
        },
      },
    },
  },
  plugins: [],
}
