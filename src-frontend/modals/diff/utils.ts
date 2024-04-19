const parseError = Math.random() + "\t\nparseError";

const zip = (a: any[], b: any[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

type ScriptParse = {
  oldContent: any;
  newContent: any;
  status: "error" | "modified" | "added" | "removed";
  scriptNo: number | any[];
}[];

/** Parse scripts in a project that have been modified */
export function parseScripts(oldProject: any, newProject: any): ScriptParse {
  let oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].parent === null)
    .map((script) => {
      try {
        return window.parseSB3Blocks.toScratchblocks(script, oldProject, "en", {
          tabs: "",
        });
      } catch {
        return parseError;
      }
    });

  let newBlocks = Object.keys(newProject)
    .filter((key) => newProject[key].parent === null)
    .map((script, i) => {
      if (oldBlocks[i] === parseError) {
        return parseError;
      }
      try {
        return window.parseSB3Blocks.toScratchblocks(script, newProject, "en", {
          tabs: "",
        });
      } catch {
        return parseError;
      }
    });

  oldBlocks = oldBlocks.map((e, i) =>
    newBlocks[i] === undefined ? undefined : e
  );

  let changed = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(
      ([a, b]) =>
        a !== b ||
        (a as unknown as string) === parseError ||
        (b as unknown as string) === parseError
    )
    //@ts-ignore
    .map(([[oldContent, newContent], scriptNo]) => {
      if (oldContent === parseError || newContent === parseError) {
        return { oldContent: "", newContent: "", status: "error", scriptNo };
      }
      let status =
        oldContent !== "" && newContent !== ""
          ? "modified"
          : oldContent === "" && newContent !== ""
          ? "added"
          : "removed";
      return { oldContent, newContent, status, scriptNo };
    });

  //@ts-ignore
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
