import { execFileSync, spawnSync } from "child_process";
import { existsSync } from "fs";

import typescript from "@rollup/plugin-typescript";
import { string } from "rollup-plugin-string";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import terser from "@rollup/plugin-terser";
import copy from "rollup-plugin-copy";

export default async (args) => {
  let build = {
    input: "src-frontend/index.ts",
    output: { file: "userscript.js", format: "iife" },
    logLevel: "silent",
    plugins: [
      string({
        include: [
          "src-frontend/modals/thumbnail.svg",
          "src-frontend/styles.css",
        ],
      }),
      nodeResolve(),
      typescript(),
    ],
  };

  if (args.debug) {
    if (!existsSync("tw_path.exe") && !existsSync("tw_path"))
      spawnSync("rustc", ["src-server/tw_path.rs"], { encoding: "utf8" });
    let path = (
      existsSync("tw_path.exe")
        ? execFileSync("./tw_path.exe", { encoding: "utf8" })
        : execFileSync("./tw_path", { encoding: "utf8" })
    ).trimEnd();
    build.plugins.push(
      copy({ targets: [{ src: "userscript.js", dest: path }] })
    );
  } else {
    build.plugins.push(terser());
  }

  return build;
};
