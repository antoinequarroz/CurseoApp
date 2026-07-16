/** @type {import('tailwindcss').Config} */
// Coursia design system — palette "vert foret / sauge / corail / creme" (rebranding).
// darkMode: 'class' car le basculement est pilote par ThemeContext (lib/theme.ts),
// pas uniquement par la media query systeme (l'utilisateur peut forcer clair/sombre).
// Source de verite reelle : lib/theme.ts (consomme via useTheme()) — ces tokens
// Tailwind sont surtout documentaires, aucun composant n'utilise bg-primary etc.
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F2D27',
          light: '#A6C1B1',
          dark: '#081712',
        },
        accent: {
          DEFAULT: '#FF7A59',
          dark: '#CC4728',
        },
        background: {
          DEFAULT: '#FFFFFF',
          secondary: '#E7EFE9',
          card: '#FFFFFF',
          warm: '#FFF5E8',
        },
        text: {
          primary: '#0F2D27',
          secondary: '#4B5D54',
          muted: '#5F756A',
        },
        status: {
          success: '#3E6B52',
          warning: '#F59E0B',
          error: '#D42020',
          'swipe-like': '#DCEAE0',
          'swipe-pass': '#FDE1D6',
        },
        enseigne: {
          coop: '#E2001A',
          migros: '#FF6600',
          lidl: '#0050AA',
          aldi: '#00AAE4',
        },
        dark: {
          primary: {
            DEFAULT: '#A6C1B1',
            light: '#C9DCD0',
            dark: '#0F2D27',
          },
          accent: {
            DEFAULT: '#4A2E22',
            dark: '#CC4728',
          },
          background: {
            DEFAULT: '#0B1613',
            secondary: '#132420',
            card: '#172B25',
            elevated: '#1E362E',
            warm: '#241C16',
          },
          text: {
            primary: '#F3F7F4',
            secondary: '#B9CAC0',
            muted: '#8CA69A',
          },
          status: {
            success: '#9DBE9F',
            warning: '#FCD34D',
            error: '#F87171',
            'swipe-like': '#1C3129',
            'swipe-pass': '#3A2016',
          },
          border: '#20372E',
        },
      },
      fontFamily: {
        // Police systeme (San Francisco sur iOS, Roboto sur Android) — equivalent
        // cross-platform de la spec moodboard "SF Pro Display / SF Pro Text".
        // Les poids sont geres via les classes font-semibold/font-medium standard.
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
