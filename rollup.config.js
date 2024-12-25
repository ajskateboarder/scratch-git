import { execFileSync, spawnSync } from "child_process";
import { existsSync } from "fs";

import typescript from "@rollup/plugin-typescript";
import css from "rollup-plugin-import-css";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import copy from "rollup-plugin-copy";

// TODO: i want to move to vite soo bad but im not sure how most of this could translate to vite :(
export default async (args) => {
  let build = {
    input: "src-frontend/index.ts",
    output: { file: "userscript.js", format: "iife" },
    logLevel: "silent",
    plugins: [
      // TODO: bring back minify when rollup-plugin-import-css #24 resolves
      css(),
      nodeResolve(),
      typescript({
        include: ["src-frontend/*.ts", "src-frontend/**/*.ts"],
      }),
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
      copy({
        targets: [
          {
            src: "userscript.js",
            dest: path,
            transform: (contents) =>
              contents
                .toString()
                .replaceAll(
                  "process.env.NODE_ENV",
                  JSON.stringify("development")
                ),
          },
        ],
      })
    );
  } else {
    build.plugins.push(
      copy({
        targets: [
          {
            src: "userscript.js",
            dest: ".",
            transform: (contents) =>
              contents
                .toString()
                .replaceAll(
                  "process.env.NODE_ENV",
                  JSON.stringify("production")
                ),
          },
        ],
      })
    );
  }

  return build;
};
