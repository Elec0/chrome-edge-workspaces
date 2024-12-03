module.exports = {
    preset: 'ts-jest/presets/js-with-ts-esm',

    // roots: [
    //     "<rootDir>/src",
    // ],
    setupFiles: ['<rootDir>/src/test/jest/mock-extension-apis.js'],
    setupFilesAfterEnv: ['<rootDir>/src/test/jest/setup-jest.js'],
    // testMatch is handled in package.json
    // testMatch: [
    //     "<rootDir>/test/unit/*.test.[tj]s"
    // ],

    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
    },
    // Without the following, the tests share mocks between them, for *some* reason
    restoreMocks: true,
    clearMocks: true,
    resetMocks: true,
};