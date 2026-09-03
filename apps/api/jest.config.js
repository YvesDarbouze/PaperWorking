/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@paperworking/financial-engine$': '<rootDir>/../../packages/financial-engine/src/index.ts',
    '^@paperworking/services$': '<rootDir>/../../packages/services/src/index.ts',
    '^@paperworking/authz$': '<rootDir>/../../packages/authz/src/index.ts',
    '^@paperworking/identity$': '<rootDir>/../../packages/identity/src/index.ts',
    '^@paperworking/database$': '<rootDir>/../../packages/database/src/index.ts',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts'],
  // Webhook/CSRF negative-path tests leave intentional console noise; forceExit
  // avoids CI hang from open handles (timers / clients) after 366 passing tests.
  forceExit: true,
};
