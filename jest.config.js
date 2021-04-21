module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      statements: 98,
      branches: 75,
      functions: 96,
      lines: 98,
    },
  },
}
