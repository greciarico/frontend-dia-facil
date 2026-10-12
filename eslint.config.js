const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  // This milestone validates mobile/shared code; inherited Web variants are out of scope.
  { ignores: ['.cache/**', '**/*.web.*'] },
]);
