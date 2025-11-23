/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: '#f6c84c',
        accent: '#1f1b2e',
        muted: '#dcd6ff',
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(180deg, #2a0f6e 0%, #5b2fd3 100%)',
        'gradient-card': 'linear-gradient(180deg, rgba(255,255,255,0.03), rgba(0,0,0,0.03))',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

