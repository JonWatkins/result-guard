export default {
  packageManager: "npm",
  reporters: ["html", "clear-text", "progress"],
  testRunner: "vitest",
  coverageAnalysis: "perTest",
  timeoutMS: 10000,
  concurrency: 4,
  checkers: ["typescript"],
  tsconfigFile: "tsconfig.json",
  typescriptChecker: {
    prioritizePerformanceOverAccuracy: true,
  },
  mutate: [
    "src/**/*.ts",
    "!src/**/*.test.ts",
    "!src/**/*.spec.ts",
    "!src/types.ts",
    "!stryker.config.mjs"
  ],
  vitest: {
    configFile: "vite.config.ts",
  },
  plugins: [
    "@stryker-mutator/typescript-checker",
    "@stryker-mutator/vitest-runner"
  ]
}; 