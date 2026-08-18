const baseConfig = require('./jest.config.js');

module.exports = {
  ...baseConfig,
  testPathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/persona-swarm/**/*.test.ts'],
  testTimeout: 300000, // 5 minutes for integration tests
  maxWorkers: 1, // Serial execution (Firebase rate limits)
  setupFilesAfterEnv: ['<rootDir>/persona-swarm/src/__tests__/setup.ts'],
};
