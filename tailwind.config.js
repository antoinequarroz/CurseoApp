/** @type {import('tailwindcss').Config} */
// Courseo design system — palette definie dans le brief produit.
// darkMode: 'class' car le basculement est pilote par ThemeContext (lib/theme.ts),
// pas uniquement par la media query systeme (l'utilisateur peut forcer clair/sombre).
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#2D6A4F',
          light: '#52B788',
          dark: '#1B4332',
        },
        accent: {
          DEFAULT: '#E8F5A3',
          dark: '#C9E52A',
        },
        background: {
          DEFAULT: '#FAFAF7',
          secondary: '#F2F0E8',
          card: '#FFFFFF',
        },
        text: {
          primary: '#1C1C1E',
          secondary: '#6B7280',
          muted: '#9CA3AF',
        },
        status: {
          success: '#52B788',
          warning: '#F59E0B',
          error: '#EF4444',
          'swipe-like': '#D1FAE5',
          'swipe-pass': '#FEE2E2',
        },
        enseigne: {
          coop: '#E2001A',
          migros: '#FF6600',
          lidl: '#0050AA',
          aldi: '#00AAE4',
        },
        dark: {
          primary: {
            DEFAULT: '#52B788',
            light: '#74C69D',
            dark: '#2D6A4F',
          },
          accent: {
            DEFAULT: '#C9E52A',
          },
          background: {
            DEFAULT: '#0F1412',
            secondary: '#1A2420',
            card: '#1F2E29',
            elevated: '#263530',
          },
          text: {
            primary: '#F0F7F4',
            secondary: '#9DB8AE',
            muted: '#5C7A70',
          },
          status: {
            success: '#74C69D',
            warning: '#FCD34D',
            error: '#F87171',
            'swipe-like': '#1A3328',
            'swipe-pass': '#2D1515',
          },
          border: '#2A3D37',
        },
      },
      fontFamily: {
        'dm-sans': ['DMSans_400Regular'],
        'dm-sans-medium': ['DMSans_500Medium'],
        'dm-sans-bold': ['DMSans_700Bold'],
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'dm-mono': ['DMMono_400Regular'],
        'dm-mono-medium': ['DMMono_500Medium'],
      },
      borderRadius: {
        xs: '6px',
        sm: '10px',
        md: '16px',
        lg: '20px',
        xl: '28px',
      },
      spacing: {
        4.5: '18px',
      },
    },
  },
  plugins: [],
};
