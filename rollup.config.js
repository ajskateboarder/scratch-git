const { default: typescript } = require("@rollup/plugin-typescript");
const { string } = require("rollup-plugin-string");

module.exports = {
  input: "src-frontend/main.ts",
  output: { file: "userscript.js", format: "iife" },
  logLevel: "silent",
  plugins: [
    string({
      include: "src-frontend/media/*",
    }),
    typescript(),
  ],
};
