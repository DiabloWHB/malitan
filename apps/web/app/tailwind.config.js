/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        'sans': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'hebrew': ['var(--font-rubik)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#EBF5FF',
          100: '#D1E9FF',
          200: '#A7D2FF',
          300: '#78B4FF',
          400: '#4A8BFF',
          500: '#2563EB',
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#1E3A8A',
          900: '#172554',
          950: '#0F1629'
        },
        // צבעי סטטוס לקריאות
        status: {
          new: '#A855F7',
          assigned: '#3B82F6',
          progress: '#F59E0B',
          waiting: '#EA580C',
          done: '#059669',
          cancelled: '#6B7280'
        },
        // חומרת תקלה
        severity: {
          low: '#6B7280',
          medium: '#3B82F6',
          high: '#EA580C',
          critical: '#DC2626'
        }
      },
      spacing: {
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        }
      }
    },
  },
  plugins: [],
}