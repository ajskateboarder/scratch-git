const parseError = Math.random() + "\t\nparseError";

const zip = (a: any[], b: any[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

export type ScriptStatus = "error" | "modified" | "added" | "removed";

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
export function parseScripts(oldProject: any, newProject: any): ScriptParse {
  let oldBlocks = Object.keys(oldProject)
    .filter((key) => oldProject[key].parent === null)
    .map((script) => {
      try {
        return window._lib.parseSB3Blocks.toScratchblocks(
          script,
          oldProject,
          "en",
          {
            tabs: "",
          }
        );
      } catch {
        return parseError;
      }
    })
    .sort((a, b) => a.localeCompare(b));

  let newBlocks = Object.keys(newProject)
    .filter((key) => newProject[key].parent === null)
    .map((script, i) => {
      if (oldBlocks[i] === parseError) {
        return { content: parseError };
      }
      try {
        return {
          content: window._lib.parseSB3Blocks.toScratchblocks(
            script,
            newProject,
            "en",
            {
              tabs: "",
            }
          ),
          script,
        };
      } catch {
        return { content: parseError };
      }
    })
    .sort((a, b) => a.content.localeCompare(b.content));

  oldBlocks = oldBlocks.map((e, i) =>
    newBlocks[i] === undefined ? undefined : e
  );

  let justTheStatements = newBlocks.map((e) => e.content);
  if (newBlocks.length < oldBlocks.length) {
    oldBlocks.forEach((_, i) => {
      if (justTheStatements.includes(oldBlocks[i])) {
        newBlocks.splice(i, 0, { content: "" });
      }
    });
  } else if (oldBlocks.length > newBlocks.length) {
    newBlocks.forEach((_, i) => {
      if (oldBlocks.includes(justTheStatements[i])) {
        oldBlocks.splice(i, 0, "");
      }
    });
  }

  let changed = zip(oldBlocks, newBlocks)
    .map((e, i) => [e, i])
    .filter(
      ([a, b]) =>
        a !== b ||
        (a as unknown as string) === parseError ||
        (b as unknown as string) === parseError
    )
    // @ts-ignore - 'number | any[]' must have a '[Symbol.iterator]()' method that returns an iterator
    .map(([[oldContent, { content: newContent, script }], scriptNo]) => {
      if (oldContent === parseError || newContent === parseError) {
        return { oldContent: "", newContent: "", status: "error", scriptNo };
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

export function diff(
  oldContent: string = "",
  newContent: string = ""
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

// https://github.com/TurboWarp/scratch-gui/blob/develop/src/addons/addons/find-bar/blockly/Utils.js

function topStack(block: any) {
  let base = block;
  while (base.getOutputShape() && base.getSurroundParent()) {
    base = base.getSurroundParent();
  }
  return base;
}

export function scrollBlockIntoView(blockOrId: string) {
  let workspace = window.Blockly.getMainWorkspace();
  let offsetX = 32;
  let offsetY = 32;
  let block = workspace.getBlockById(blockOrId);

  let root = block.getRootBlock();
  let base = topStack(block);
  let ePos = base.getRelativeToSurfaceXY(),
    rPos = root.getRelativeToSurfaceXY(),
    scale = workspace.scale,
    x = rPos.x * scale,
    y = ePos.y * scale,
    xx = block.width + x,
    yy = block.height + y,
    s = workspace.getMetrics();

  if (
    x < s.viewLeft + offsetX - 4 ||
    xx > s.viewLeft + s.viewWidth ||
    y < s.viewTop + offsetY - 4 ||
    yy > s.viewTop + s.viewHeight
  ) {
    let sx = x - s.contentLeft - offsetX,
      sy = y - s.contentTop - offsetY;

    workspace.scrollbar.set(sx, sy);
  }
}
