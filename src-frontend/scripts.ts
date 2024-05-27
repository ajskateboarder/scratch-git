import { diff } from "./api";
import { toScratchblocks } from "./lib";
import { zip } from "./utils";

export type ScriptStatus = "modified" | "added" | "removed";

interface ScriptParse {
  oldContent: string;
  newContent: string;
  status: ScriptStatus;
  scriptNo: number;
  script: string;
}

/** Parse scripts in a project that have been modified */
const _parseScripts = (
  oldProject: Record<string, any>,
  newProject: Record<string, any>
): ScriptParse[] => {
  const oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].parent === null)
    .map((script) => {
      return toScratchblocks(
        script,
        // fixes parsing error
        JSON.parse(
          JSON.stringify(oldProject)
            .replaceAll('{"SUBSTACK":[1,null]}', "{}")
            .replaceAll(',"SUBSTACK":[1,null]', "")
        ),
        "en",
        {
          tabs: "",
        }
      );
    })
    .sort((a, b) => a.localeCompare(b));

  const newBlocks = Object.keys(newProject)
    .filter((key) => newProject[key].parent === null)
    .map((script) => {
      return {
        content: toScratchblocks(
          script,
          JSON.parse(
            JSON.stringify(newProject)
              .replaceAll('{"SUBSTACK":[1,null]}', "{}")
              .replaceAll(',"SUBSTACK":[1,null]', "")
          ),
          "en",
          {
            tabs: "",
          }
        ),
        script,
      };
    })
    .sort((a, b) => a.content.localeCompare(b.content));

  const results = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(([a, b]) => a !== b)
    // @ts-expect-error - this doesn't have to be a Symbol.iterator
    .map(([[oldContent, { content: newContent, script }], scriptNo]) => {
      if (newContent === undefined) {
        newContent = "";
      }

      const status: ScriptStatus =
        oldContent !== "" && newContent !== ""
          ? "modified"
          : oldContent === "" && newContent !== ""
          ? "added"
          : "removed";

      return { oldContent, newContent, status, scriptNo, script };
    });

  return results as ScriptParse[];
};

/** Parses all scripts in a sprite and diffs them */
export const parseScripts = async (
  previousScripts: Record<string, any>,
  currentScripts: Record<string, any>
) => {
  const scripts = _parseScripts(previousScripts, currentScripts);
  return (
    await Promise.all(
      scripts.map((script) => diff(script.oldContent, script.newContent))
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts[i] }))
    .filter((result) => result.diffed !== "");
};
