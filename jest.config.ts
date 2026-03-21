import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  projects: [
    {
      displayName: "api",
      testEnvironment: "node",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.test.ts"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
    },
    {
      displayName: "ui",
      testEnvironment: "jsdom",
      preset: "ts-jest",
      testMatch: ["<rootDir>/src/**/*.test.tsx"],
      moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/src/$1",
      },
      setupFilesAfterEnv: ["@testing-library/jest-dom"],
    },
  ],
};

export default config;
