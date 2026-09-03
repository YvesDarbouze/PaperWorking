/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@paperworking/validation$': '<rootDir>/../validation/src/index.ts',
    '^@paperworking/authz$': '<rootDir>/../authz/src/index.ts',
    '^@paperworking/services$': '<rootDir>/../services/src/index.ts',
    '^@paperworking/financial-engine$': '<rootDir>/../financial-engine/src/index.ts',
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
