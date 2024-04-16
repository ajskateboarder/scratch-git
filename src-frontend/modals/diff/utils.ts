const zip = (a: any[], b: any[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

/** Parse scripts in a project that have been modified */
export function parseScripts(oldProject: any, newProject: any) {
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
  } catch (e: any) {
    console.error(e.stack);
    throw new Error("failed to parse blocks");
  }

  let changed = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(([a, b]) => a !== b)
    //@ts-ignore
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

export function diff(
  oldContent: string,
  newContent: string
): Promise<{ added: number; removed: number; diffed: string }> {
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
