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
  let oldBlocks, newBlocks;
  try {
    oldBlocks = Object.keys(oldProject)
      .filter((key) => oldProject[key].parent === null)
      .map((script) =>
        window.parseSB3Blocks.toScratchblocks(script, oldProject, "en", {
          tabs: "",
        })
      );
    newBlocks = Object.keys(newProject)
      .filter((key) => newProject[key].parent === null)
      .map((script) =>
        window.parseSB3Blocks.toScratchblocks(script, newProject, "en", {
          tabs: "",
        })
      );
  } catch {}

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

/**
 * @param {string} oldContent
 * @param {string} newContent
 * @returns {Promise<{added: number; removed: number; diffed: string}>}
 */
export function diff(oldContent, newContent) {
  return new Promise((resolve, reject) => {
    let ws = new WebSocket("ws://localhost:8000");
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          command: "diff",
          data: {
            GitDiff: { old_content: oldContent, new_content: newContent },
          },
        })
      );
    };
    ws.onmessage = (message) => {
      return resolve(JSON.parse(message.data));
    };
    ws.onerror = (error) => {
      return reject(error);
    };
  });
}
