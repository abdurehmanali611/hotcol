/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          esModuleInterop: true,
          moduleResolution: "node",
          module: "commonjs",
        },
      },
    ],
  },
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
    // Mock Next.js server-only modules
    "^next/dist/shared/lib/app-router-context\\.shared-runtime$":
      "<rootDir>/__mocks__/next-app-router.js",
    "^next/(.*)$": "<rootDir>/__mocks__/next.js",
    // Mock sonner toast
    "^sonner$": "<rootDir>/__mocks__/sonner.js",
    // Mock xlsx and file-saver (not needed for unit tests)
    "^xlsx$": "<rootDir>/__mocks__/xlsx.js",
    "^file-saver$": "<rootDir>/__mocks__/file-saver.js",
    // Mock react-hook-form
    "^react-hook-form$": "<rootDir>/__mocks__/react-hook-form.js",
  },
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

module.exports = config;
