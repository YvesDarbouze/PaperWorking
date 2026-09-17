/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/__tests__/setup-env.ts'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@/(.*)\\.js$': '<rootDir>/$1',
    '^@/(.*)$': '<rootDir>/$1',
    '^@paperworking/api$': '<rootDir>/../api/src/index.ts',
    '^@paperworking/authz$': '<rootDir>/../../packages/authz/src/index.ts',
    '^@paperworking/database$': '<rootDir>/../../packages/database/src/index.ts',
    '^@paperworking/financial-engine$': '<rootDir>/../../packages/financial-engine/src/index.ts',
    '^@paperworking/identity$': '<rootDir>/../../packages/identity/src/index.ts',
    '^@paperworking/services$': '<rootDir>/../../packages/services/src/index.ts',
    '^@paperworking/shared$': '<rootDir>/../../packages/shared/src/index.ts',
    '^@paperworking/validation$': '<rootDir>/../../packages/validation/src/index.ts',
    '^next/image$': '<rootDir>/src/__tests__/mocks/next-image.tsx',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
          jsx: 'react-jsx',
        },
      },
    ],
  },
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};
