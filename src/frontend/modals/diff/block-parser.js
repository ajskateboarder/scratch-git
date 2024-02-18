const zip = (a, b) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [a[i], b[i]]);

export default function (oldProject, newProject) {
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

  return zip(oldBlocks, newBlocks).filter(([a, b]) => a !== b);
}
