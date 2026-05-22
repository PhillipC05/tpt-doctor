import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  moduleFileExtensions: ['ts', 'js', 'json'],
  moduleNameMapper: {
    '@tpt-doctor/config': '<rootDir>/../config/src',
    '@tpt-doctor/shared': '<rootDir>/../shared/src',
    '@tpt-doctor/database': '<rootDir>/../database/src',
  },
};

export default config;