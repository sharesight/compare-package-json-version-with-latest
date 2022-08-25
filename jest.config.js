module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  setupFilesAfterEnv: ["./jest.setup.js"],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    // "node_modules/package-json/.+\\.(js|jsx)?$": "ts-jest"
  },
  transformIgnorePatterns: ["<rootDir>/node_modules/(?!package-json)"],
  // moduleFileExtensions: [
  //   "ts",
  //   "tsx",
  //   "js",
  //   "jsx",
  //   "json",
  //   "node"
  // ],
  // moduleDirectories: [
  //   "node_modules",
  //   "src"
  // ],
};
