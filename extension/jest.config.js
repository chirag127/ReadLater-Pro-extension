/**
 * Jest configuration for the extension
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'background/**/*.js',
    'content/**/*.js',
    'popup/**/*.js',
    'pages/scripts/**/*.js'
  ],
  coverageReporters: ['text', 'lcov'],
  testTimeout: 10000
};
