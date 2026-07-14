const expoConfig = require('eslint-config-expo/flat');

module.exports = [
  ...expoConfig,
  {
    ignores: ['dist/*', 'supabase/functions/**'],
  },
  {
    files: ['jest.setup.js', 'jest.config.js', '__tests__/**/*'],
    languageOptions: {
      globals: { jest: 'readonly' },
    },
  },
  {
    // La regle react-hooks/immutability (React Compiler) ne connait pas la
    // convention Reanimated ou `sharedValue.value = x` est la mutation attendue.
    rules: {
      'react-hooks/immutability': 'off',
    },
  },
];
