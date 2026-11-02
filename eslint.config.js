const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['scripts/**/*.cjs', 'tests/**/*.cjs'],
    languageOptions: { sourceType: 'commonjs', globals: { __dirname: 'readonly', __filename: 'readonly' } },
  },
  // This milestone validates mobile/shared code; inherited Web variants are out of scope.
  { ignores: ['.cache/**', '**/*.web.*'] },
]);
