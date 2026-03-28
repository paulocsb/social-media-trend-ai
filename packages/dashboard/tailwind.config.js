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
        background: '#F5F5F7',   // Apple's page background
        surface: '#FFFFFF',       // Cards, panels
        overlay: 'rgba(0,0,0,0.4)',

        // Text
        primary:   '#1D1D1F',     // Apple near-black
        secondary: '#6E6E73',     // Apple medium gray
        tertiary:  '#AEAEB2',     // Apple light gray

        // Accent
        accent: {
          DEFAULT:  '#0071E3',    // Apple blue
          hover:    '#0077ED',
          light:    '#E8F0FE',
        },

        // Borders
        border:     '#D2D2D7',
        'border-subtle': '#E8E8ED',

        // Semantic
        success:     '#34C759',
        warning:     '#FF9F0A',
        destructive: '#FF3B30',
        info:        '#30B0C7',
      },
      borderRadius: {
        DEFAULT: '10px',
        sm:      '6px',
        md:      '10px',
        lg:      '14px',
        xl:      '20px',
        full:    '9999px',
      },
      boxShadow: {
        card:   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)',
        panel:  '0 4px 16px rgba(0,0,0,0.08)',
        modal:  '0 20px 60px rgba(0,0,0,0.16)',
        subtle: '0 1px 2px rgba(0,0,0,0.05)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      keyframes: {
        'fade-in':  { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.97)' },     to: { opacity: '1', transform: 'scale(1)' } },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
      },
      animation: {
        'fade-in':  'fade-in 0.18s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
        'spin-slow': 'spin-slow 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
