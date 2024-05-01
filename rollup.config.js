import typescript from "@rollup/plugin-typescript";
import { string } from "rollup-plugin-string";
import { nodeResolve } from "@rollup/plugin-node-resolve";
// import terser from "@rollup/plugin-terser";

export default {
  input: "src-frontend/index.ts",
  output: { file: "userscript.js", format: "iife" },
  logLevel: "silent",
  plugins: [
    string({
      include: ["src-frontend/components/modals/thumbnail.svg", "src-frontend/styles.css"],
    }),
    nodeResolve(),
    typescript(),
    // TODO: apply terser in releases
    // terser(),
  ],
};
