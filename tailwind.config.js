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
          DEFAULT: '#3E6B52',
          light: '#7FA087',
          dark: '#1B3A2E',
        },
        accent: {
          DEFAULT: '#F3C7A6',
          dark: '#DD7C4E',
        },
        background: {
          DEFAULT: '#FAF6EC',
          secondary: '#F0E7D6',
          card: '#FFFFFF',
        },
        text: {
          primary: '#1C1E1B',
          secondary: '#5B6B60',
          muted: '#55654A',
        },
        status: {
          success: '#3E6B52',
          warning: '#F59E0B',
          error: '#D42020',
          'swipe-like': '#DCE9DA',
          'swipe-pass': '#FBE0D2',
        },
        enseigne: {
          coop: '#E2001A',
          migros: '#FF6600',
          lidl: '#0050AA',
          aldi: '#00AAE4',
        },
        dark: {
          primary: {
            DEFAULT: '#7FA087',
            light: '#9DBE9F',
            dark: '#3E6B52',
          },
          accent: {
            DEFAULT: '#EFA173',
          },
          background: {
            DEFAULT: '#101E17',
            secondary: '#182A20',
            card: '#1F3428',
            elevated: '#274030',
          },
          text: {
            primary: '#F3EFE2',
            secondary: '#A8C2AC',
            muted: '#87A38C',
          },
          status: {
            success: '#9DBE9F',
            warning: '#FCD34D',
            error: '#F87171',
            'swipe-like': '#203526',
            'swipe-pass': '#3A2820',
          },
          border: '#2C4535',
        },
      },
      fontFamily: {
        // Quicksand (ronde/douce) pour les titres — nom de classe neutre pour
        // ne pas coupler le design system a un choix de police precis.
        heading: ['Quicksand_400Regular'],
        'heading-medium': ['Quicksand_500Medium'],
        'heading-bold': ['Quicksand_700Bold'],
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
