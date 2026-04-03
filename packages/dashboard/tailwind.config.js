/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        // SF Pro Text: optimised for ≤19px — used as the default body font
        sans: [
          'SF Pro Text', 'SF Pro Icons',
          '-apple-system', 'BlinkMacSystemFont',
          'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
        // SF Pro Display: optimised for ≥20px — applied via font-display utility
        display: [
          'SF Pro Display', 'SF Pro Icons',
          '-apple-system', 'BlinkMacSystemFont',
          'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif',
        ],
        mono: [
          'SF Mono', 'ui-monospace',
          'SFMono-Regular', 'Menlo', 'monospace',
        ],
      },
      colors: {
        // RGB-channel vars → opacity modifiers (bg-background/50) work correctly
        background:       'rgb(var(--background) / <alpha-value>)',
        surface:          'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        overlay:          'rgba(0,0,0,0.75)',
        primary:          'rgb(var(--primary) / <alpha-value>)',

        // Pre-mixed rgba vars — used as-is, no opacity modifier needed
        secondary: 'var(--secondary)',
        tertiary:  'var(--tertiary)',

        // Accent — Apple Blue, same in both modes
        accent: {
          DEFAULT: '#0071e3',
          hover:   '#0077ed',
          light:   'rgba(0,113,227,0.12)',
        },

        // Borders
        border:          'var(--border)',
        'border-subtle': 'var(--border-subtle)',

        // Semantic — CSS vars, different per mode
        success:     'var(--success)',
        warning:     'var(--warning)',
        destructive: 'var(--destructive)',
        info:        'var(--info)',

        // Surface interaction tokens — replace bg-white/* across the app
        'surface-inset':  'var(--surface-inset)',   // ~5% tint (subtle bg, inputs)
        'surface-hover':  'var(--surface-hover)',   // hover state
        'surface-active': 'var(--surface-active)',  // active/selected (12% tint)
        'surface-tint':   'var(--surface-tint)',    // tracks, placeholders (8-10%)
        'surface-strong': 'var(--surface-strong)',  // stronger tint (toggle inactive)
      },
      borderRadius: {
        // Vision Pro rounded scale — intentionally larger than Apple web
        DEFAULT: '12px',
        sm:      '8px',
        md:      '12px',
        lg:      '16px',
        xl:      '20px',
        '2xl':   '24px',
        full:    '9999px',
      },
      boxShadow: {
        card:      'var(--glass-shadow)',
        panel:     'var(--glass-raised-shadow)',
        modal:     'rgba(0,0,0,0.5) 0px 24px 80px 0px',
        subtle:    '0 2px 8px rgba(0,0,0,0.3)',
        glow:      '0 0 28px rgba(0,113,227,0.35)',
        'glow-sm': '0 0 14px rgba(0,113,227,0.2)',
        button:    'inset 0 0 0 1px var(--border-subtle), 0 2px 8px rgba(0,0,0,0.3)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px', letterSpacing: '-0.08px' }],
        'caption':     ['11px',  { lineHeight: '16px', letterSpacing: '-0.12px' }],
        'body-sm':     ['12px',  { lineHeight: '18px', letterSpacing: '-0.12px' }],
        'body-md':     ['14px',  { lineHeight: '20px', letterSpacing: '-0.224px' }],
        'body-lg':     ['18px',  { lineHeight: '26px', letterSpacing: '-0.374px' }],
        'body-xl':     ['20px',  { lineHeight: '28px', letterSpacing: '-0.374px' }],
        'title-lg':    ['24px',  { lineHeight: '30px', fontWeight: '600', letterSpacing: '-0.374px' }],
        'title-xl':    ['28px',  { lineHeight: '34px', fontWeight: '600', letterSpacing: '-0.28px' }],
        'headline-md': ['32px',  { lineHeight: '36px', fontWeight: '600', letterSpacing: '-0.28px' }],
        'headline-lg': ['40px',  { lineHeight: '44px', fontWeight: '600', letterSpacing: '-0.28px' }],
        'headline-xl': ['48px',  { lineHeight: '52px', fontWeight: '600', letterSpacing: '-0.28px' }],
      },
      keyframes: {
        'fade-in':   { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in':  { from: { opacity: '0', transform: 'scale(0.96)' },     to: { opacity: '1', transform: 'scale(1)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition:  '200% 0' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1',   transform: 'scale(1)' },
          '50%':      { opacity: '0.5', transform: 'scale(0.85)' },
        },
      },
      animation: {
        'fade-in':   'fade-in 0.22s ease-out',
        'scale-in':  'scale-in 0.2s ease-out',
        'spin-slow': 'spin-slow 1.4s linear infinite',
        'shimmer':   'shimmer 1.6s ease-in-out infinite',
        'pulse-dot': 'pulse-dot 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
