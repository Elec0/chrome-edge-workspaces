module.exports = {
    preset: 'ts-jest/presets/js-with-ts-esm',

    // roots: [
    //     "<rootDir>/src",
    // ],
    setupFiles: ['<rootDir>/src/test/mock-extension-apis.js'],
    // testMatch: [
    //     "**/test/unit/*.test.[tj]s"
    // ],

    extensionsToTreatAsEsm: ['.ts'],
    transform: {
        "^.+\\.ts$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
    },
};