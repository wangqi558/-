module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<srcDirectory>/src', '<srcDirectory>/tests'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/server.ts',
    '!src/config/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<srcDirectory>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<srcDirectory>/src/$1',
  },
  testTimeout: 10000,
};
