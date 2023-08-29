// https://stackoverflow.com/a/27870199/16019146
function pause(ms) {
  var date = Date.now();
  var curDate;
  do {
    curDate = Date.now();
  } while (curDate - date < ms);
}

// Funny editor "hack" so I don't need htm
const html = (string) => string;

globalThis.diffs = undefined;

const _removeAlert = () =>
  (document.querySelector(".alerts_alerts-inner-container_0UOfk").innerHTML =
    "");

/** @param {{message: string; showTime: number}} */
const Alert = ({ message, showTime }) => {
  document.querySelector(
    ".alerts_alerts-inner-container_0UOfk"
  ).innerHTML = html`<div
    class="alert_alert_K5u0l alert_success_QZsAp box_box_2jjDp"
    style="justify-content: space-between"
  >
    <div class="alert_alert-message_b1o2e"></div>
    <div class="alert_alert-buttons_qzCdj">
      <div class="alert_alert-close-button-container_sK95e box_box_2jjDp">
        <div
          aria-label="Close"
          class="close-button_close-button_hsJUK alert_alert-close-button_XMbBP close-button_large_UcF64"
          role="button"
          tabindex="0"
        >
          <img
            class="close-button_close-icon_rixGf undefined"
            style="filter: invert(70%)"
            src="data:image/svg+xml;base64,PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdHlsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVmcz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg=="
          />
        </div>
      </div>
    </div>
  </div>`;
  let text = document.createElement("span");
  text.appendChild(document.createTextNode(message));
  if (document.querySelector("body").getAttribute("theme") === "dark") {
    document.querySelector(
      ".close-button_close-button_hsJUK"
    ).style.backgroundColor = "rgba(0, 0, 0, 0.255)";
  }
  document.querySelector(".alert_alert-message_b1o2e").appendChild(text);
  document.querySelector(".close-button_close-button_hsJUK").onclick =
    _removeAlert;
  setTimeout(_removeAlert, showTime);
};

window.onload = () => {
  document.head.innerHTML += html`
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link
      rel="stylesheet"
      type="text/css"
      href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
    />
  `;
  document.head.innerHTML += html`<style>
    #push-status:hover {
      cursor: pointer;
    }
    .content {
      display: flex;
    }
    .sidebar {
      width: fit-content;
      position: fixed;
      top: 25%;
      height: 50%;
      padding-right: 5px;
      border-right: 1px solid grey;
      background-color: #e6f0ff;
      overflow: auto;
    }
    .sidebar ul {
      list-style-type: none;
      margin: 0;
      padding: 0;
    }
    .sidebar li {
      list-style-type: none;
    }
    .sidebar li button {
      padding: 15px 30px;
      border: 0.5px solid grey;
      background-color: #d9e3f2;
      color: hsla(225, 15%, 40%, 0.75);
      transition: 0.2s background-color ease-in;
      margin-top: 10px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    .sidebar li button:hover {
      background-color: #ccd3dd;
    }
    .sidebar li button.active-tab {
      color: hsla(0, 100%, 65%, 1);
      background-color: white;
      outline: none;
    }
    .blocks {
      flex: 1;
      padding: 20px;
      margin-left: 12.5%;
    }
    .bottom {
      margin-top: auto;
    }
    #commitLog {
      height: 50%;
      max-height: 50%;
      padding: 0;
      width: 50%;
    }
    .bottom-bar {
      position: sticky;
      width: 100%;
      display: flex;
      justify-content: space-between;
      background-color: transparent;
      padding: 10px;
      bottom: 0;
    }
    .bottom-bar select {
      font-size: 14px;
      background-color: hsla(0, 100%, 65%, 1);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
    .tab-btn {
      display: flex;
      align-items: center;
    }
    .tab-btn i {
      font-size: 17px;
      margin-right: 10px;
    }
    .scratchblocks {
      margin-left: 10px;
    }
    .dark {
      background-color: #111;
      color: #eee;
    }
    .dark #scripts li button {
      background-color: rgb(46, 46, 46);
      color: #707070;
    }
    .dark #scripts li button.active-tab {
      background-color: rgb(76, 76, 76);
      color: #eee;
    }
  </style>`;

  let BUTTON_ROW =
    "#app > div > div.gui_menu-bar-position_RwwFc.menu-bar_menu-bar_48TYq.box_box_-Ky8F > div.menu-bar_main-menu_ZLuRH > div:nth-child(6)";

  document.querySelector(BUTTON_ROW).innerHTML += html`&nbsp;
    <div class="menu-bar_account-info-group_uqH-z">
      <div class="menu-bar_menu-bar-item_hHpQG">
        <div id="push-status">
          <span>Push project</span>
        </div>
      </div>
    </div>`;

  document.querySelector(BUTTON_ROW).innerHTML += html`<dialog
    id="commitLog"
    style="overflow-x: hidden"
  >
    <div class="content">
      <div class="sidebar">
        <ul id="scripts"></ul>
        <br />
      </div>
      <div class="blocks">
        <p id="commits">Hello worldus</p>
        <div
          class="bottom-bar"
          style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
        >
          <select onchange="rerender(this.value)" id="styleChoice">
            <option value="scratch3">Scratch 3.0</option>
            <option value="scratch2">Scratch 2.0</option>
            <option value="scratch3-high-contrast">
              Scratch 3.0 (High Contrast)
            </option>
          </select>
          <button
            onclick="document.querySelector('#commitLog').close()"
            class="settings-modal_button_CutmP"
            id="commitButton"
          >
            Okay
          </button>
        </div>
      </div>
    </div>
  </dialog>`;

  setTimeout(() => {
    document.querySelector("#push-status").onclick = async () => {
      document.querySelector("#push-status").style.opacity = "0.5";
      document.querySelector("#push-status").querySelector("span").innerText =
        "Pushing project...";
      await fetch("http://localhost:6969/push");
      document.querySelector("#push-status").style.opacity = "1";
      document.querySelector("#push-status").querySelector("span").innerText =
        "Push project";
      Alert({ message: "Commits pushed successfully", showTime: 5000 });
    };
  }, 500);
};

function diff(oldArray, newArray) {
  const dp = new Array(oldArray.length + 1)
    .fill(null)
    .map(() => new Array(newArray.length + 1).fill(0));
  for (let i = 1; i <= oldArray.length; i++) {
    for (let j = 1; j <= newArray.length; j++) {
      if (oldArray[i - 1] === newArray[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  /** @type {{added: string[]; removed: string[]; modified: string[]}} */
  const changes = {
    added: [],
    removed: [],
    modified: [],
  };
  let i = oldArray.length;
  let j = newArray.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArray[i - 1] === newArray[j - 1]) {
      i--;
      j--;
    } else if (j === 0 || (i > 0 && dp[i][j] === dp[i - 1][j])) {
      changes.removed.push(oldArray[i - 1]);
      i--;
    } else if (i === 0 || (j > 0 && dp[i][j] === dp[i][j - 1])) {
      changes.added.push(newArray[j - 1]);
      j--;
    } else {
      changes.modified.push({
        from: oldArray[i - 1],
        to: newArray[j - 1],
      });
      i--;
      j--;
    }
  }
  changes.added.reverse();
  changes.removed.reverse();
  return changes;
}

function merge(oldArray, newArray) {
  const mergedArray = [...oldArray];

  for (const newItem of newArray) {
    if (!mergedArray.includes(newItem)) {
      mergedArray.push(newItem);
    }
  }

  return mergedArray;
}

function parseTheBlocks(oldProject, newProject, scriptNumber) {
  const oldBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(oldProject).filter((key) =>
      oldProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    oldProject,
    "en",
    {
      tabs: "",
    }
  );

  const newBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(newProject).filter((key) =>
      newProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    newProject,
    "en",
    {
      tabs: "",
    }
  );

  return {
    oldBlocks,
    newBlocks,
  };
}

function rerender(style) {
  const activeButton = parseInt(
    document
      .querySelector("button[class='tab-btn active-tab']")
      .getAttribute("script-no")
  );
  globalThis.diffs[activeButton].renderBlocks(style);
}
const count = (list, item) =>
  list.reduce(
    (count, currentValue) => count + (currentValue === item ? 1 : 0),
    0
  );
class ScriptDiff {
  /** @type {string[]} */
  old;
  /** @type {string[]} */
  new;
  difference;
  /** @type {string[]} */
  merged;
  /** @type {number} */
  scriptNo;
  /** @type {("added" | "removed" | "modified")} */
  status;

  /**
   * @constructor
   * @param {object} oldProject
   * @param {object} newProject
   * @param {number} scriptNumber
   */
  constructor({ oldProject, newProject, scriptNumber, skipParsing = false }) {
    if (!skipParsing) {
      const parsed = parseTheBlocks(oldProject, newProject, scriptNumber);
      this.old = parsed.oldBlocks
        .split("\n")
        .map((item, i) => `${i} ${item.trim()}`);
      this.new = parsed.newBlocks
        .split("\n")
        .map((item, i) => `${i} ${item.trim()}`);
    }
    this.scriptNo = scriptNumber;
    if (!skipParsing) {
      this.difference = diff(this.old, this.new);
      this.merged = merge(this.old, this.new);
    }
    this.merged = this.fixCBlocks(this.merged);
  }

  /** @param {string[]} merged @returns {string[]}*/
  fixCBlocks(merged) {
    let mergedNre = merged.map((e) => e.slice(2).trim());
    let foreverFound = false;
    [...mergedNre].forEach((block, i) => {
      if (block === "forever") {
        foreverFound = true;
      }
      if (block === "end" && foreverFound) {
        mergedNre = mergedNre.filter((e) => e !== mergedNre[i]);
        foreverFound = false;
      }
    });
    while (count(mergedNre, "forever") !== count(mergedNre, "end")) {
      mergedNre.push("end");
    }
    return mergedNre.map((e, i) => `${i} ${e}`);
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
      } catch {}
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
  renderBlocks(style = "scratch3") {
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
    console.log(code);
    console.log(this.difference.added);
    console.log(this.difference.removed);
    // highlight blocks that have been removed in merge
    this.merged.forEach((item, i) => {
      if (removedC.includes(item)) {
        removedC = removedC.filter((e) => e !== item);
        const block = blocks[i].cloneNode(true);
        block.style.fill = "red";
        block.style.opacity = "0.5";
        blocks[i].parentElement.appendChild(block);
      }
    });

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
    console.log(addedC);
    // TODO: support more C-blocks
    if (addedC[0].endsWith("forever")) {
      let forevers = blocks.filter(
        (e) => e.parentElement.querySelector("text").innerHTML === "forever"
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

    // remove duplicate highlights
    const htmls = Array.from(document.querySelectorAll("path[class^='sb3-'"));
    const noDupes = [...new Set(htmls.map((e) => e.outerHTML))];

    const dupesOnly = htmls.filter((e) => !noDupes.includes(e.outerHTML));
    dupesOnly.forEach((element) => element.remove());
  }
}

/**
 * @param {object} oldProject
 * @param {object} newProject
 */
function createDiffs(oldProject, newProject) {
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
    script.difference = diff(script.old, script.new);
    script.merged = merge(script.old, script.new);
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
    script.difference = diff(script.old, script.new);
    script.merged = merge(script.old, script.new);
    script.scriptNo = e.index;
    script.status = "added";
    diffs.added.push(script);
  });
  return diffs;
}

async function showDiffs(oldProject, newProject) {
  await import(
    "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
  );
  await import(
    "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
  );

  const diffs = createDiffs(oldProject, newProject);

  document.querySelector("#scripts").innerHTML = "";
  document.querySelector("#commits").innerHTML = "";

  document.querySelector("#commitButton").onclick = async () => {
    const message = await (await fetch("http://localhost:6969/commit")).text();
    document.querySelector("#commitLog").close();
    Alert({ message: `Commit successful. ${message}`, showTime: 5000 });
  };

  const modal = document.querySelector("#commitLog");
  if (!modal.open) {
    modal.showModal();
  }

  Array.from(Object.values(diffs))
    .flat(Infinity)
    .forEach((diff, i) => {
      let newItem = document.createElement("li");

      let link = document.createElement("button");
      link.title = diff.status.charAt(0).toUpperCase() + diff.status.slice(1);
      link.classList.add("tab-btn");
      link.setAttribute("script-no", i);
      link.onclick = () => {
        diff.renderBlocks(document.querySelector("#styleChoice").value);
        document
          .querySelectorAll(".tab-btn")
          .forEach((e) => e.classList.remove("active-tab"));
        link.classList.add("active-tab");
      };
      switch (diff.status) {
        case "added":
          link.innerHTML = `<i class="fa-solid fa-square-plus"></i> Script ${diff.scriptNo}`;
          break;
        case "modified":
          link.innerHTML = `<i class="fa-solid fa-square-minus"></i> Script ${diff.scriptNo}`;
          break;
        case "removed":
          link.innerHTML = `<i class="fa-solid fa-square-xmark"></i> Script ${diff.scriptNo}`;
          break;
      }
      newItem.appendChild(link);
      document.querySelector("#scripts").appendChild(newItem);
    });

  document.querySelectorAll(".tab-btn")[0].classList.add("active-tab");
  document.querySelector("#styleChoice").value = "scratch3";
  Array.from(Object.values(diffs)).flat(Infinity)[0].renderBlocks();
  globalThis.diffs = Array.from(Object.values(diffs)).flat(Infinity);
  if (document.querySelector("body").getAttribute("theme") === "dark") {
    document.querySelector(".sidebar").classList.add("dark");
  } else {
    document.querySelector(".sidebar").classList.remove("dark");
  }
}

setInterval(() => {
  try {
    document.querySelector(".save-status_save-now_xBhky").onclick = () => {
      (async () => {
        pause(1000);
        await fetch("http://localhost:6969/unzip");
        pause(1000);

        const oldProject = await (
          await fetch("http://localhost:6969/project.old.json")
        ).json();

        const newProject = await (
          await fetch("http://localhost:6969/project.json")
        ).json();

        await showDiffs(oldProject, newProject);
      })();
    };
  } catch {}
}, 500);
