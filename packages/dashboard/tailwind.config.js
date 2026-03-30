/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'SF Pro Text',
          'Inter', 'system-ui', 'sans-serif',
        ],
      },
      colors: {
        // Page & surface
        background:      '#080816',
        surface:         '#0F0F23',
        'surface-raised':'#161630',
        overlay:         'rgba(0,0,0,0.7)',

        // Text
        primary:   '#E8E8F5',
        secondary: '#8080A0',
        tertiary:  '#50506E',

        // Accent — soft violet
        accent: {
          DEFAULT: '#8B5CF6',
          hover:   '#7C3AED',
          light:   'rgba(139,92,246,0.15)',
        },

        // Borders
        border:          'rgba(255,255,255,0.1)',
        'border-subtle': 'rgba(255,255,255,0.06)',

        // Semantic
        success:     '#10B981',
        warning:     '#F59E0B',
        destructive: '#EF4444',
        info:        '#38BDF8',
      },
      borderRadius: {
        DEFAULT: '12px',
        sm:      '8px',
        md:      '12px',
        lg:      '16px',
        xl:      '20px',
        '2xl':   '24px',
        full:    '9999px',
      },
      boxShadow: {
        card:     '0 4px 24px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)',
        panel:    '0 8px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
        modal:    '0 24px 80px rgba(0,0,0,0.7)',
        subtle:   '0 2px 8px rgba(0,0,0,0.3)',
        glow:     '0 0 28px rgba(139,92,246,0.35)',
        'glow-sm':'0 0 14px rgba(139,92,246,0.25)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.96)' },     to: { opacity: '1', transform: 'scale(1)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in':   'fade-in 0.22s ease-out',
        'scale-in':  'scale-in 0.2s ease-out',
        'spin-slow': 'spin-slow 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
