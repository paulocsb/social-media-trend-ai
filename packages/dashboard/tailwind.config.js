/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'SF Pro Display', 'SF Pro Text',
          '-apple-system', 'BlinkMacSystemFont',
          'Inter', 'system-ui', 'sans-serif',
        ],
        mono: [
          'SF Mono', 'ui-monospace',
          'SFMono-Regular', 'Menlo', 'monospace',
        ],
      },
      colors: {
        // Surface scale
        background:       '#0D0D0D',
        surface:          '#191B1E',   // surface-400
        'surface-raised': '#33383D',   // surface-300
        overlay:          'rgba(0,0,0,0.75)',

        // Text
        primary:   '#FFFFFF',                      // surface-100
        secondary: 'rgba(235,235,245,0.6)',         // opacity-font primary
        tertiary:  'rgba(235,235,245,0.35)',

        // Accent — lime/chartreuse
        accent: {
          DEFAULT: '#B9DB23',                      // primary-400
          hover:   '#CFF241',                      // primary-300
          light:   'rgba(185,219,35,0.12)',
        },

        // Borders
        border:          'rgba(255,255,255,0.08)',
        'border-subtle': 'rgba(255,255,255,0.05)', // stroke-button primary

        // Semantic
        success:     '#55CD0A',   // success-400
        warning:     '#F59E0B',
        destructive: '#E94045',   // danger-400
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
        card:      '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
        panel:     '0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        modal:     '0 24px 80px rgba(0,0,0,0.8)',
        subtle:    '0 2px 8px rgba(0,0,0,0.4)',
        glow:      '0 0 28px rgba(185,219,35,0.3)',
        'glow-sm': '0 0 14px rgba(185,219,35,0.2)',
        button:    'inset 0 0 0 1px rgba(255,255,255,0.05), 0 2px 8px rgba(0,0,0,0.4)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        // Typography scale (SF Pro, base 16, scale 1.2)
        'caption':    ['11px',  { lineHeight: '16px' }],
        'body-sm':    ['12px',  { lineHeight: '18px' }],
        'body-md':    ['14px',  { lineHeight: '20px' }],
        'body-lg':    ['18px',  { lineHeight: '26px' }],
        'body-xl':    ['20px',  { lineHeight: '28px' }],
        'title-lg':   ['24px',  { lineHeight: '30px', fontWeight: '600' }],
        'title-xl':   ['28px',  { lineHeight: '34px', fontWeight: '600' }],
        'headline-md':['32px',  { lineHeight: '38px', fontWeight: '700' }],
        'headline-lg':['40px',  { lineHeight: '46px', fontWeight: '700' }],
        'headline-xl':['48px',  { lineHeight: '54px', fontWeight: '700' }],
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
