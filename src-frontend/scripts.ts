import { diff } from "./api";
import { toScratchblocks } from "./lib";

const zip = (a: any[], b: any[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

export type ScriptStatus = "modified" | "added" | "removed";

interface ScriptParse {
  results: {
    oldContent: string;
    newContent: string;
    status: ScriptStatus;
    scriptNo: number;
    script: string;
  }[];
  changedIds: string[];
}

/** Parse scripts in a project that have been modified */
function _parseScripts(
  oldProject: Record<string, any>,
  newProject: Record<string, any>,
): ScriptParse {
  const oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].parent === null)
    .map((script) => {
      return toScratchblocks(
        script,
        // fixes parsing error
        JSON.parse(
          JSON.stringify(oldProject)
            .replaceAll('{"SUBSTACK":[1,null]}', "{}")
            .replaceAll(',"SUBSTACK":[1,null]', ""),
        ),
        "en",
        {
          tabs: "",
        },
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
              .replaceAll(',"SUBSTACK":[1,null]', ""),
          ),
          "en",
          {
            tabs: "",
          },
        ),
        script,
      };
    })
    .sort((a, b) => a.content.localeCompare(b.content));

  const changed = zip(oldBlocks, newBlocks)
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

  return { results: changed } as ScriptParse;
}

/** Parses all scripts in a sprite and diffs them */
export async function parseScripts(
  previousScripts: Record<string, any>,
  currentScripts: Record<string, any>,
) {
  const scripts = _parseScripts(previousScripts, currentScripts);
  return (
    await Promise.all(
      scripts.results.map((script) =>
        diff(script.oldContent, script.newContent),
      ),
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts.results[i] }))
    .filter((result) => result.diffed !== "");
}
