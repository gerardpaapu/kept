/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
export default {
  preset: "ts-jest/presets/js-with-ts-esm",
  setupFiles: ['dotenv/config'],
  rootDir: "src",
};
