const zip = (a, b) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

/** Parse scripts in a project that have been modified
 * @param {object} oldProject
 * @param {object} newProject
 */
export function parseScripts(oldProject, newProject) {
  // parseSB3Blocks is imported in frontend/initialize.js
  const oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].opcode.startsWith("event_when"))
    .map((script) =>
      parseSB3Blocks.toScratchblocks(script, oldProject, "en", {
        tabs: "",
      })
    );

  const newBlocks = Object.keys(newProject)
    .filter((key) => newProject[key].opcode.startsWith("event_when"))
    .map((script) =>
      parseSB3Blocks.toScratchblocks(script, newProject, "en", {
        tabs: "",
      })
    );

  let changed = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(([a, b]) => a !== b)
    .map(([[oldContent, newContent], scriptNo]) => {
      let status =
        oldContent !== "" && newContent !== ""
          ? "modified"
          : oldContent === "" && newContent !== ""
          ? "added"
          : "removed";
      return { oldContent, newContent, status, scriptNo };
    });

  return changed;
}
