/**
 * MMRMS design tokens — components reference these names only.
 * No raw hex values should live in JSX.
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#12131A',
          soft: '#1A1B24',
          deep: '#0D0E14',
          line: '#2A2B36',
        },
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          violet: '#8B5CF6',
          'violet-light': '#A78BFA',
        },
        canvas: { DEFAULT: '#F4F5F8', subtle: '#ECEEF3' },
        line: { DEFAULT: '#E8E9EF', strong: '#DCDDE6', faint: '#F0F1F5' },
        muted: {
          DEFAULT: '#6B7280',
          soft: '#9CA3AF',
          strong: '#374151',
          faint: '#B0B5C0',
        },
        good: { DEFAULT: '#10B981', ink: '#047857', tint: '#ECFDF5' },
        warn: { DEFAULT: '#F59E0B', ink: '#B45309', tint: '#FFFBEB' },
        bad: { DEFAULT: '#F43F5E', ink: '#E11D48', tint: '#FFF1F2' },
        neutral: { DEFAULT: '#64748B', ink: '#475569', tint: '#F1F5F9' },
        sidebar: {
          DEFAULT: '#12131A',
          hover: 'rgba(255,255,255,0.06)',
          active: 'rgba(99,102,241,0.18)',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        display: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      borderRadius: {
        card: '16px',
        field: '12px',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(18,19,26,.03), 0 4px 16px -4px rgba(18,19,26,.08), 0 12px 32px -12px rgba(18,19,26,.10)',
        'card-hover':
          '0 2px 4px rgba(18,19,26,.04), 0 8px 24px -6px rgba(18,19,26,.12), 0 20px 40px -16px rgba(99,102,241,.10)',
        raised: '0 4px 14px rgba(99,102,241,.30), 0 2px 6px rgba(99,102,241,.15)',
        glow: '0 0 20px rgba(99,102,241,.25), 0 4px 12px rgba(139,92,246,.20)',
        pop: '0 2px 10px rgba(0,0,0,.06), 0 8px 20px -8px rgba(0,0,0,.08)',
        inner: 'inset 0 1px 2px rgba(18,19,26,.06)',
        'inner-field': 'inset 0 1px 3px rgba(18,19,26,.05)',
        topbar: '0 1px 0 rgba(18,19,26,.04), 0 4px 16px -8px rgba(18,19,26,.06)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
        'brand-gradient-hover': 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
        'brand-gradient-subtle':
          'linear-gradient(135deg, rgba(99,102,241,0.10) 0%, rgba(139,92,246,0.06) 100%)',
        'sidebar-glow':
          'radial-gradient(ellipse 80% 50% at 20% 0%, rgba(99,102,241,0.15) 0%, transparent 70%)',
      },
      keyframes: {
        fadeRise: {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.02)' },
        },
        badgePop: {
          '0%': { opacity: '0', transform: 'scale(0.85)' },
          '60%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        spinSlow: {
          to: { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        fadeRise: 'fadeRise .5s cubic-bezier(0.22, 1, 0.36, 1) both',
        fadeIn: 'fadeIn .4s ease both',
        slideUp: 'slideUp .55s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
        pulseSoft: 'pulseSoft 2s ease-in-out infinite',
        badgePop: 'badgePop .35s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        spinSlow: 'spinSlow 1.2s linear infinite',
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
