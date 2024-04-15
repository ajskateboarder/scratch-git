import typescript from "@rollup/plugin-typescript";
import { string } from "rollup-plugin-string";
import { nodeResolve } from "@rollup/plugin-node-resolve";

export default {
  input: "src-frontend/main.ts",
  output: { file: "userscript.js", format: "iife" },
  logLevel: "silent",
  plugins: [
    string({
      include: "src-frontend/media/*",
    }),
    nodeResolve(),
    typescript(),
  ],
};
