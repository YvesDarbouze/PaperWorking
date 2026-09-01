/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@paperworking/api$': '<rootDir>/../api/src/index.ts',
    '^@paperworking/authz$': '<rootDir>/../../packages/authz/src/index.ts',
    '^@paperworking/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@paperworking/identity$': '<rootDir>/../../packages/identity/src/index.ts',
    '^@paperworking/services$': '<rootDir>/../../packages/services/src/index.ts',
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
};
