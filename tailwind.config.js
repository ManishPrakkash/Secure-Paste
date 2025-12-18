/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./public/**/*.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Background colors
        'bg-primary': '#0F0F0F',
        'bg-secondary': '#171717',
        'bg-tertiary': '#1F1F1F',
        'bg-elevated': '#262626',

        // Text colors
        'text-primary': '#FAFAFA',
        'text-secondary': '#A3A3A3',
        'text-muted': '#737373',

        // Accent colors
        'accent-primary': '#22C55E',
        'accent-secondary': '#3B82F6',
        'accent-warning': '#F59E0B',
        'accent-danger': '#EF4444',

        // Border colors
        'border-subtle': '#262626',
        'border-default': '#333333',
        'border-strong': '#404040',
      },
      borderRadius: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      spacing: {
        'sm': '6px',
        'md': '8px',
        'lg': '12px',
        'xl': '16px',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
