import { html } from "../../utils";
import api from "../../api";
import { Scratchblocks } from "../../lib/index";
import { Cmp } from "../../dom/index";

import { parseScripts, diff } from "./utils";

/**
 * @param {string} name
 * @param {string} id
 */
function setting(name, id) {
  return html`<div class="${Cmp.SETTINGS_LABEL}" id="${id}">
  <label class="${Cmp.SETTINGS_LABEL}">
    <input class="${Cmp.SETTINGS_CHECKBOX} ${Cmp.CHECKBOX}" type="checkbox"></input>
    <span>${name}</span>
  </label>
</div>`;
}

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends HTMLDialogElement {
  /** @type {HTMLUListElement} */
  scripts;
  /** @type {HTMLParagraphElement} */
  commits;
  /** @type {HTMLButtonElement} */
  closeButton;
  /** @type {HTMLInputElement} */
  useHighlights;
  /** @type {HTMLInputElement} */
  plainText;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.innerHTML += html`<div class="sidebar">
      <aside>
        <ul id="scripts"></ul>
      </aside>
      <main>
        <div class="content">
          <p id="commits"><br>
            <p id="commitView"></p>
          </p>
          <div class="bottom-bar" style="
            margin: 0;
            padding: 0;
            width: 98%;
            bottom: 15px;
            justify-content: right">
            <button
              id="closeButton"
              class="${Cmp.SETTINGS_BUTTON}"
              style="margin-left: 10px"
            >
              Okay
            </button>
          </div>
        </div>
      </main>
    </div>`;
    this.scripts = this.querySelector("#scripts");
    this.commits = this.querySelector("#commitView");
    this.closeButton = this.querySelector("#closeButton");
    this.querySelector("#commits").innerHTML =
      setting("Use highlights", "useHighlights") +
      "&nbsp;&nbsp;" +
      setting("Plain text", "plainText") +
      this.querySelector("#commits").innerHTML;
    this.useHighlights = this.querySelector("#useHighlights input");
    this.plainText = this.querySelector("#plainText input");
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`).appendChild(fragment);
    document
      .querySelector(`dialog[is="${this.getAttribute("is")}"]`)
      .showModal();
  }

  /**
   * @param {import("../../api").Project} project
   * @param {string} sprite
   * @param {number} script - 0 by default
   */
  async diff(project, sprite, script = 0) {
    // try again in case of undefined
    if (!project) project = await api.getCurrentProject();
    const oldProject = await project.getPreviousScripts(sprite);
    const newProject = await project.getCurrentScripts(sprite);

    const scripts = parseScripts(oldProject, newProject);
    // not sure why all this isn't just done by diff()
    const diffs = (
      await Promise.all(
        scripts.map((script) => diff(script.oldContent, script.newContent))
      )
    )
      .map((diffed, i) => ({ ...diffed, ...scripts[i] }))
      .filter((result) => result.diffed !== "")
      .map((result) => {
        if (
          !["+", "-", "-\n+", ""]
            .map((e) => e + "when @greenFlag clicked")
            .map((e) => result.diffed.trimStart().startsWith(e))
            .some((e) => e === true)
        ) {
          return {
            ...result,
            diffed: " when @greenFlag clicked\n" + result.diffed.trimStart(),
          };
        }
        return result;
      });

    try {
      this.scripts.innerHTML = "";
      this.commits.innerText = diffs[script].diffed ?? "";
      Scratchblocks.appendStyles();
      Scratchblocks.renderMatching("#commitView", {
        style: "scratch3",
        scale: 0.675,
      });
      this.commits.innerHTML += "<br>";
    } catch {}

    this.closeButton.onclick = () => {
      this.useHighlights.checked = false;
      this.close();
    };

    const highlightDiff = () => {
      let svg = this.querySelectorAll(".scratchblocks svg > g");
      svg.forEach((blocks) => {
        blocks.querySelectorAll("path.sb3-diff").forEach((diff) => {
          let moddedBlock = diff.previousElementSibling.cloneNode(true);
          let fillColor = diff.classList.contains("sb3-diff-ins")
            ? "green"
            : diff.classList.contains("sb3-diff-del")
            ? "red"
            : "grey";
          moddedBlock
            .querySelectorAll("path,g,rect") // g selector isn't needed maybe but just in case..
            .forEach((element) => {
              element.style = `fill: ${fillColor}; opacity: 0.5`;
            });
          diff.previousElementSibling.after(moddedBlock);
          diff.remove();
        });
      });
    };

    const highlightPlain = () => {
      let content = diffs[script].diffed ?? "";
      this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
      if (this.useHighlights.checked) {
        let highlights = content
          .split("\n")
          .map(
            (e, i) =>
              `<span style="background-color: rgba(${
                e.startsWith("-")
                  ? "255,0,0"
                  : e.startsWith("+")
                  ? "0,255,0"
                  : "255,255,255"
              },0.5)">${i == 0 ? e.trimStart() : e}</span>`
          );
        this.commits.innerHTML = `<pre>${highlights.join("<br>")}</pre><br>`;
      }
    };

    const darkDiff = (theme) => {
      let svg = this.querySelectorAll(".scratchblocks svg > g");
      if (theme === "dark") {
        svg.forEach((blocks) => {
          blocks
            .querySelectorAll("path.sb3-diff")
            .forEach(
              (diff) => (diff.style = "stroke: white; stroke-width: 3.5px")
            );
        });
      } else {
        svg.forEach((blocks) => {
          blocks
            .querySelectorAll("path.sb3-diff")
            .forEach((diff) => (diff.style = ""));
        });
      }
    };

    // fixes git diff snipping artifacts
    const removeExtraEnds = () => {
      let svg = this.querySelector(".scratchblocks svg > g");
      svg.querySelectorAll(":scope > g").forEach((blocks) => {
        if (blocks.querySelectorAll("path").length === 1) {
          let block = blocks.querySelector("path");
          if (
            block.classList.length === 1 &&
            block.classList.contains("sb3-control") &&
            blocks.querySelector("text").innerHTML === "end"
          ) {
            blocks.remove();
          }
        }
      });
    };

    this.useHighlights.onchange = () => {
      if (this.useHighlights.checked) {
        highlightDiff();
        if (this.plainText.checked) {
          highlightPlain();
        }
      } else {
        if (this.plainText.checked) {
          let content = diffs[script].diffed ?? "";
          this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
        } else {
          this.commits.innerText = diffs[script].diffed ?? "";
          Scratchblocks.appendStyles();
          Scratchblocks.renderMatching("#commitView", {
            style: "scratch3",
            scale: 0.675,
          });
          removeExtraEnds();
          this.commits.innerHTML += "<br>";
        }
      }
      darkDiff(
        getComputedStyle(document.body).getPropertyValue("--color-scheme")
      );
    };

    this.plainText.onchange = () => {
      if (this.plainText.checked) {
        if (this.useHighlights.checked) {
          highlightPlain();
        } else {
          let content = diffs[script].diffed ?? "";
          this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
        }
      } else {
        Scratchblocks.appendStyles();
        Scratchblocks.renderMatching("#commitView", {
          style: "scratch3",
          scale: 0.675,
        });
        this.commits.innerHTML += "<br>";
        removeExtraEnds();
        if (this.useHighlights.checked) highlightDiff();
      }
      darkDiff(
        getComputedStyle(document.body).getPropertyValue("--color-scheme")
      );
    };

    // assign diff displaying to diffs
    diffs.forEach(async (diff, i) => {
      let newItem = document.createElement("li");
      let link = document.createElement("button");
      link.classList.add("tab-btn");
      link.setAttribute("script-no", i.toString());
      link.onclick = async () => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((e) => e.classList.remove("active-tab"));
        link.classList.add("active-tab");
        await this.diff(
          project,
          sprite,
          parseInt(
            this.querySelector("button.active-tab").getAttribute("script-no")
          )
        );
      };
      link.innerHTML = `<i class="fa-solid fa-square-${
        diff.status === "added"
          ? "plus"
          : diff.status === "removed"
          ? "xmark"
          : "minus"
      }"></i> Script ${diff.scriptNo}`;
      newItem.appendChild(link);
      this.scripts.appendChild(newItem);
    });

    document
      .querySelector(`button[script-no="${script}"]`)
      .classList.add("active-tab");

    // dark mode
    let theme = getComputedStyle(document.body).getPropertyValue(
      "--color-scheme"
    );
    if (theme === "dark") document.querySelector("aside").classList.add("dark");
    else document.querySelector("aside").classList.remove("dark");
    darkDiff(theme);
    removeExtraEnds();
    this.useHighlights.checked = false;
    this.plainText.checked = false;

    if (!this.open) this._showMe();
  }
}
