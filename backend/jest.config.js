/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  clearMocks: true,
  setupFiles: ['dotenv/config'],
  moduleNameMapper: {
    '^@prisma/client$': '<rootDir>/tests/__mocks__/@prisma/client.ts',
  },
};
