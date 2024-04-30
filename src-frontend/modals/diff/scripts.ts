import { diff } from "../../api";

const zip = (a: any[], b: any[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

export type ScriptStatus = "modified" | "added" | "removed";

type ScriptParse = {
  results: {
    oldContent: any;
    newContent: any;
    status: ScriptStatus;
    scriptNo: number | any[];
    script: string;
  }[];
  changedIds: string[];
};

/** Parse scripts in a project that have been modified */
function _parseScripts(oldProject: any, newProject: any): ScriptParse {
  let oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].parent === null)
    .map((script) => {
      return window._lib.parseSB3Blocks.toScratchblocks(
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

  let newBlocks = Object.keys(newProject)
    .filter((key) => newProject[key].parent === null)
    .map((script) => {
      return {
        content: window._lib.parseSB3Blocks.toScratchblocks(
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

  let changed = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(([a, b]) => a !== b)
    // @ts-ignore - 'number | any[]' must have a '[Symbol.iterator]()' method that returns an iterator
    .map(([[oldContent, { content: newContent, script }], scriptNo]) => {
      if (newContent === undefined) {
        newContent = "";
      }

      let status: ScriptStatus =
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
export async function parseScripts(previousScripts: {}, currentScripts: {}) {
  let scripts = _parseScripts(previousScripts, currentScripts);
  return (
    await Promise.all(
      scripts.results.map((script) =>
        diff(script.oldContent, script.newContent)
      )
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts.results[i] }))
    .filter((result) => result.diffed !== "");
}
