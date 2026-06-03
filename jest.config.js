/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/src/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  // @swc/jest — Node 22 compatible; ts-jest/bs-logger breaks on Node 22
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', tsx: true, decorators: false },
          transform: { react: { runtime: 'automatic' } },
        },
      },
    ],
  },
  transformIgnorePatterns: ['/node_modules/'],
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/.next-app/',
    '<rootDir>/.next.old_1777068220/',
    '<rootDir>/out/'
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/.next-app/',
    '<rootDir>/.next.old_1777068220/',
    '<rootDir>/out/'
  ],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
};

module.exports = config;
