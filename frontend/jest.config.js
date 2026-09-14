module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  globals: { 'ts-jest': { isolatedModules: true } },
};
