/**
 * Design tokens lifted from the MMRMS artifacts. Components reference these
 * names only — no raw hex values live in JSX.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#1A1B23', soft: '#2A2B35', line: '#3A3B45' },
        brand: {
          50: '#EEF0FF',
          100: '#E3E5FD',
          200: '#C9C7F7',
          300: '#A5A0E8',
          500: '#4F46E5',
          600: '#4338CA',
        },
        canvas: '#F7F7F9',
        line: { DEFAULT: '#ECECEF', strong: '#E4E4EA' },
        muted: {
          DEFAULT: '#7A7A84',
          soft: '#9A9AA4',
          strong: '#4A4A54',
          faint: '#A0A0AA',
        },
        good: { DEFAULT: '#10B981', ink: '#047857', tint: '#E9F8F1' },
        warn: { DEFAULT: '#F59E0B', ink: '#B45309', tint: '#FFF6E8' },
        bad: { DEFAULT: '#F43F5E', ink: '#E11D48', tint: '#FFF0F3' },
        neutral: { DEFAULT: '#64748B', ink: '#475569', tint: '#EEF0F3' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '16px',
        field: '11px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(26,27,35,.04), 0 8px 24px -16px rgba(26,27,35,.18)',
        raised: '0 4px 14px rgba(79,70,229,.26)',
        pop: '0 2px 10px rgba(0,0,0,.05)',
      },
      keyframes: {
        fadeRise: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        fadeRise: 'fadeRise .45s ease both',
        shimmer: 'shimmer 1.3s linear infinite',
      },
    },
  },
  plugins: [],
};
