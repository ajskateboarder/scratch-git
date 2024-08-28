import { diff } from "../api";
import { toScratchblocks } from "../lib";
import { zip } from "../utils";

export type ScriptStatus = "modified" | "added" | "removed";

interface ScriptParse {
  oldContent: string;
  newContent: string;
  status: ScriptStatus;
  scriptNo: number;
  script: string;
  json: ProjectJSON;
  oldJSON: ProjectJSON;
  oldScript: string;
}

export class ProjectJSON {
  topLevels: string[];
  json: Record<string, any>;

  constructor(_json: Record<string, any>) {
    this.topLevels = Object.keys(_json).filter(
      (key) => _json[key].parent === null
    );
    // fixes parsing error
    this.json = JSON.parse(
      JSON.stringify(_json)
        .replaceAll('{"SUBSTACK":[1,null]}', "{}")
        .replaceAll(',"SUBSTACK":[1,null]', "")
    );
  }

  /** Get a blockly script stack from a starting id */
  getStack(startId: string) {
    let stack: Record<string, any> = {};
    let id = startId;
    while (id !== null) {
      const block = this.json[id];
      [...JSON.stringify(block).matchAll(/":\[(?:1|2|3),"(\w)"/g)].forEach(
        (e) => (stack[e[1]] = this.json[e[1]])
      );
      stack[id] = block;
      id = block["next"];
    }

    // randomize block ids to prevent json key collision
    const matches = [
      ...JSON.stringify(stack).matchAll(/":\[(?:1|2|3),"(\w)"/g),
    ].map((e) => e[0]);
    matches.forEach((match) => {
      const ogId = match.substring(6, match.length - 1);
      const id = crypto.randomUUID();
      stack = JSON.parse(
        JSON.stringify(stack)
          .replaceAll(match, `${match.substring(0, match.length - 2)}${id}"`)
          .replaceAll(new RegExp(`:"${ogId}"`, "g"), `:"${id}"`)
          .replaceAll(new RegExp(`"${ogId}":`, "g"), `"${id}":`)
      );
    });

    return stack;
  }
}

/** Parse scripts in a project that have been modified */
const _parseScripts = (
  oldProject: ProjectJSON,
  newProject: ProjectJSON
): ScriptParse[] => {
  const oldBlocks = oldProject.topLevels
    .map((script) => {
      return {
        content: toScratchblocks(script, oldProject.json, "en", {
          tabs: "",
        }),
        json: oldProject,
        script,
      };
    })
    .sort((a, b) => a.content.localeCompare(b.content));

  const newBlocks = newProject.topLevels
    .map((script) => {
      return {
        content: toScratchblocks(script, newProject.json, "en", {
          tabs: "",
        }),
        script,
        json: newProject,
      };
    })
    .sort((a, b) => a.content.localeCompare(b.content));

  const results = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(([a, b]) => a !== b)
    .map(
      ([
        // @ts-expect-error
        [
          { content: oldContent, script: oldScript, json: oldJSON },
          { content: newContent, script, json },
        ],
        scriptNo,
      ]) => {
        oldContent ??= "";
        newContent ??= "";

        const status: ScriptStatus =
          oldContent !== "" && newContent !== ""
            ? "modified"
            : oldContent === "" && newContent !== ""
            ? "added"
            : "removed";

        return {
          oldContent,
          newContent,
          status,
          scriptNo,
          script,
          json,
          oldJSON,
          oldScript,
        };
      }
    );

  return results as ScriptParse[];
};

/** Parses all scripts in a sprite and diffs them */
export const parseScripts = async (
  projectName: string,
  previousScripts: ProjectJSON,
  currentScripts: ProjectJSON
) => {
  const scripts = _parseScripts(previousScripts, currentScripts);
  return (
    await Promise.all(
      scripts.map((script) =>
        diff(projectName, script.oldContent, script.newContent)
      )
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts[i] }))
    .filter((result) => result.diffed !== "");
};
