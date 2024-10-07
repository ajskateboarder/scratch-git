const process = require("process");
const { toScratchblocks } = require("./parse-sb3-blocks.cjs");

const zip = (a, b) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

class ProjectJSON {
  topLevels;
  json;

  constructor(_json) {
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
}

const parseScripts = (
  oldProject,
  newProject
) => {
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
    .filter(([a, _]) => a[0].content !== a[1].content)
    .map(
      ([
        [
          { content: oldContent },
          { content: newContent },
        ],
        scriptNo,
      ]) => {
        oldContent ??= "";
        newContent ??= "";

        const status =
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
        };
      }
    );

  return results;
};

(async () => {
  try {
    const [oldJSON, newJSON] = (await process.stdin.toArray())
      .toString()
      .trim().split("\r\n");
    process.stdout.write(JSON.stringify(parseScripts(new ProjectJSON(JSON.parse(oldJSON)), new ProjectJSON(JSON.parse(newJSON)))));
  } catch (e) {
    console.error(e)
    process.exit(1);
  }
})();
