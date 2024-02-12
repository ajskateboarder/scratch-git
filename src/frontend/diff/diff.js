import * as ArrayUtils from "../utils";
import parseBlocks from "./block-parser";


/**
 * @typedef ScriptDiffOptions
 * @property {object} oldProject
 * @property {object} newProject
 * @property {number} scriptNumber
 * @property {boolean?} skipParsing
 */


export class ScriptDiff {
  /** @type {("added" | "removed" | "modified")} */
  status;

  /**
   * @param {ScriptDiffOptions}
   */
  constructor({ oldProject, newProject, scriptNumber, skipParsing = false }) {
    if (!skipParsing) {
      const parsed = parseBlocks(oldProject, newProject, scriptNumber);
      this.old = parsed.oldBlocks
        .split("\n")
        .map((item, i) => `${i} ${item.trim()}`);
      this.new = parsed.newBlocks
        .split("\n")
        .map((item, i) => `${i} ${item.trim()}`);
    }
    this.scriptNo = scriptNumber;

    if (!skipParsing) {
      this.difference = ArrayUtils.diff(this.old, this.new);
      this.merged = ScriptDiff.fixCBlocks(ArrayUtils.merge(this.old, this.new));
    }
  }

  /** @param {string[]} merged @returns {string[]}*/
  static fixCBlocks(merged) {
    /** @type {string[]} */
    let mergedNre = merged.map((e) => e.substring(e.indexOf(" ") + 1));
    let cBlockFound = false;
    [...mergedNre].forEach((block, i) => {
      if (block === "forever" || block.startsWith("repeat")) {
        cBlockFound = true;
      }
      if (block === "end" && cBlockFound) {
        mergedNre = mergedNre.filter((e) => e !== mergedNre[i]);
        cBlockFound = false;
      }
    });
    let cBlocksOnly = mergedNre.map((e) => {
      if (e.includes("forever") || e.includes("repeat")) {
        return "cBlock";
      } else if (e.includes("end")) {
        return "end";
      } else {
        return e;
      }
    });
    while (
      ArrayUtils.count(cBlocksOnly, "cBlock") !==
      ArrayUtils.count(cBlocksOnly, "end")
    ) {
      mergedNre.push("end");
      cBlocksOnly.push("end");
    }
    let returned = mergedNre.map((e, i) => `${i} ${e}`);
    return returned;
  }

  /** @returns {boolean} */
  get hasDiffs() {
    return !(
      this.difference.added.length === 0 &&
      this.difference.removed.length === 0 &&
      this.difference.modified.length === 0
    );
  }

  /** @returns {string[]} */
  static events(project) {
    return Object.keys(project).filter((key) =>
      project[key].opcode.startsWith("event_when")
    );
  }

  /** Finds all scripts which have been modified in some way */
  static availableSprites(oldProject, newProject) {
    const _scripts = this.events(oldProject);
    const _newScripts = this.events(newProject);

    const scripts = _scripts.map((e, i) => ({ scriptLoc: e, index: i }));
    const newScripts = _newScripts.map((e, i) => ({ scriptLoc: e, index: i }));

    const modified = scripts.filter((e) => {
      try {
        const oldblocks = parseSB3Blocks.toScratchblocks(
          _scripts[e.index],
          oldProject,
          "en",
          {
            tabs: "",
          }
        );
        const newblocks = parseSB3Blocks.toScratchblocks(
          _newScripts[e.index],
          newProject,
          "en",
          {
            tabs: "",
          }
        );
        return oldblocks !== newblocks;
      } catch {
        console.warn(e);
      }
    });

    const removed = scripts.filter((e) => newScripts[e.index] === undefined);
    const added = newScripts.filter((e) => scripts[e.index] === undefined);

    return {
      modified,
      removed,
      added,
    };
  }

  /** @param {("scratch3" | "scratch3-high-contrast" | "scratch2")} style */
  async renderBlocks(style = "scratch3") {
    const code = this.merged
      .map((item) => item.substring(item.indexOf(" ") + 1))
      .join("\n");
    document.querySelector("#commits").innerText = code;

    scratchblocks.renderMatching("#commits", {
      style: style,
      scale: style === "scratch2" ? 1.15 : 0.675,
    });

    let blocks = Array.from(
      document.querySelectorAll(`.scratchblocks-style-${style} g > g path`)
    ).filter((e) => e?.parentElement?.nextElementSibling?.innerHTML !== "then");
    if (style === "scratch2") {
      blocks = blocks.filter((e) => !e.classList.contains("sb-input"));
    }

    let addedC = [...this.difference.added];
    let removedC = [...this.difference.removed];

    // highlight blocks that have been removed in merge
    if (this.status !== "added") {
      // added scripts don't have any removed blocks lol
      this.merged.forEach((item, i) => {
        if (removedC.includes(item)) {
          try {
            removedC = removedC.filter((e) => e !== item);
            const block = blocks[i].cloneNode(true);
            block.style.fill = "red";
            block.style.opacity = "0.5";
            blocks[i].parentElement.appendChild(block);
          } catch { }
        }
      });
    }

    // highlight blocks that have been added in merge
    this.merged.forEach((item, i) => {
      if (addedC.includes(item)) {
        addedC = addedC.filter((e) => e !== item);
        let block;
        try {
          block = blocks[i].cloneNode(true);
        } catch (e) {
          return console.warn(`${e}\n\nFailed to find/parse block ${i}`);
        }
        block.style.fill = "green";
        block.style.opacity = "0.5";
        try {
          blocks[i].parentElement.appendChild(block);
        } catch (e) {
          console.warn(`${e}\n\nFailed to find/parse block ${i}`);
        }
      }
    });

    if (
      typeof addedC[0] !== "undefined" &&
      (addedC[0].endsWith("forever") || addedC[0].includes("repeat"))
    ) {
      let forevers = blocks.filter((e) =>
        ["forever", "repeat"].includes(e.parentElement.querySelector("text").innerHTML)
      );
      if (forevers.length === 1) {
        let afterForevers = blocks.slice(blocks.indexOf(forevers[0]));
        afterForevers.forEach((block) => {
          let copy = block.cloneNode();
          copy.style.fill = "green";
          copy.style.opacity = "0.5";
          block.parentElement.appendChild(copy);
        });
      } else {
        let lineNo = parseInt(addedC[0].split(" ")[0]);
        let changedForeverBlock = forevers[lineNo - 1] ?? forevers[lineNo - 2];
        let shrek2 = blocks.slice(blocks.indexOf(changedForeverBlock));
        shrek2.forEach((block) => {
          let copy = block.cloneNode();
          copy.style.fill = "green";
          copy.style.opacity = "0.5";
          block.parentElement.appendChild(copy);
        });
      }
    }

    if (this.status === "added") {
      blocks.forEach((block) => {
        let copy = block.cloneNode();
        copy.style.fill = "green";
        copy.style.opacity = "0.5";
        block.parentElement.appendChild(copy);
      });
    }

    // remove duplicate highlights
    const htmls = Array.from(document.querySelectorAll("path[class^='sb3-'"));

    if (addedC.length !== 0) {
      htmls
        .slice(
          htmls.indexOf(htmls.filter((e) => e.style.fill === "red").pop()) + 1
        )
        .forEach((block) => {
          let copy = block.cloneNode();
          copy.style.fill = "green";
          copy.style.opacity = "0.5";
          block.parentElement.appendChild(copy);
        });
    }

    const noDupes = [...new Set(htmls.map((e) => e.outerHTML))];

    const dupesOnly = htmls.filter((e) => !noDupes.includes(e.outerHTML));
    dupesOnly.forEach((element) => element.remove());
  }
}


/**
 * @param {object} oldProject
 * @param {object} newProject
 */
export function createDiffs(oldProject, newProject) {
  const changes = ScriptDiff.availableSprites(oldProject, newProject);

  /** @type {{modified: ScriptDiff[]; removed: ScriptDiff[]; added: ScriptDiff[]}} */
  const diffs = {
    modified: [],
    removed: [],
    added: [],
  };

  changes.modified.forEach((e) => {
    const script = new ScriptDiff({
      oldProject: oldProject,
      newProject: newProject,
      scriptNumber: e.index,
    });

    script.status = "modified";
    if (script.hasDiffs) {
      diffs.modified.push(script);
    }
  });

  changes.removed.forEach((e) => {
    const oldBlocks = parseSB3Blocks.toScratchblocks(
      e.scriptLoc,
      oldProject,
      "en",
      {
        tabs: "",
      }
    );
    const script = new ScriptDiff({ skipParsing: true });
    script.old = oldBlocks.split("\n").map((item, i) => `${i} ${item.trim()}`);
    script.new = "".split("\n").map((item, i) => `${i} ${item.trim()}`);
    script.difference = ArrayUtils.diff(script.old, script.new);
    script.merged = ScriptDiff.fixCBlocks(
      ArrayUtils.merge(script.old, script.new)
    );
    script.scriptNo = e.index;
    script.status = "removed";
    diffs.removed.push(script);
  });

  changes.added.forEach((e) => {
    const newBlocks = parseSB3Blocks.toScratchblocks(
      e.scriptLoc,
      newProject,
      "en",
      {
        tabs: "",
      }
    );
    const script = new ScriptDiff({ skipParsing: true });
    script.old = "".split("\n").map((item, i) => `${i} ${item.trim()}`);
    script.new = newBlocks.split("\n").map((item, i) => `${i} ${item.trim()}`);
    script.difference = ArrayUtils.diff(script.old, script.new);
    script.merged = ScriptDiff.fixCBlocks(
      ArrayUtils.merge(script.old, script.new)
    );
    script.scriptNo = e.index;
    script.status = "added";
    diffs.added.push(script);
  });
  return diffs;
}
