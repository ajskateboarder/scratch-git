import { html } from "../../utils";
import Cmp from "../../accessors";
import api from "../../api";
import { Scratchblocks } from "../../lib";
import { scratchAlert } from "../../gui-components";

import { parseScripts, diff } from "./utils";

export class DiffModal extends HTMLDialogElement {
  /** @type {HTMLUListElement} */
  scripts;
  /** @type {HTMLParagraphElement} */
  commits;
  /** @type {HTMLButtonElement} */
  commitButton;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector(".content")) return;
    this.innerHTML += html`<div class="content">
      <div class="topbar"></div>
      <div class="sidebar">
        <br />
      </div>
      <div class="blocks">
        <div
          class="bottom-bar"
          style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
        ></div>
      </div>
    </div>`;
    this.scripts = Object.assign(document.createElement("ul"), {
      id: "scripts",
    });
    this.querySelector(".sidebar")?.prepend(this.scripts);
    this.commits = Object.assign(document.createElement("p"), {
      id: "commits",
    });
    this.querySelector(".blocks")?.prepend(this.commits);
    this.commitButton = Object.assign(document.createElement("button"), {
      id: "commitButton",
      innerText: "Okay",
      className: Cmp.SETTINGS_BUTTON,
    });
    this.querySelector(".bottom-bar")?.appendChild(this.commitButton);
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`)?.appendChild(fragment);
    document.querySelector(this.id)?.showModal();
  }

  /**
   * @param {string} sprite
   * @param {number} script - 0 by default
   */
  async diff(sprite, script = 0) {
    let project = await api.getCurrentProject();
    // try again in case of undefined
    if (!project) project = await api.getCurrentProject();
    const sprites = await project?.getSprites();

    const oldProject = await project?.getPreviousScripts(sprite);
    const newProject = await project?.getCurrentScripts(sprite);

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
        if (!result.diffed.trimStart().startsWith("when @greenFlag clicked")) {
          return {
            ...result,
            diffed: " when @greenFlag clicked\n" + result.diffed.trimStart(),
          };
        }
        return result;
      });
    console.log(diffs);

    this.scripts.innerHTML = "";
    this.querySelector(".topbar").innerHTML = "";
    this.commits.innerText = diffs[script].diffed;

    Scratchblocks.appendStyles();
    Scratchblocks.renderMatching("#commits", {
      style: "scratch3",
      scale: 0.675,
    });

    this.commitButton.onclick = async () => {
      const message = await project?.commit();
      this.close();
      scratchAlert({
        message: `Commit successful. ${message}`,
        duration: 5000,
      });
    };

    // append sprites
    sprites?.forEach((sprite) => {
      let newItem = Object.assign(document.createElement("a"), {
        href: "#whatever",
        innerText: sprite,
        onclick: async () => {
          document
            .querySelectorAll(".topbar a")
            .forEach((e) => e.classList.remove("active-tab"));
          newItem.classList.add("active-tab");

          await this.diff(sprite);
        },
      });
      this.querySelector(".topbar")?.appendChild(newItem);
    });

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
        this.diff(
          sprite,
          parseInt(
            this.querySelector("button.active-tab")?.getAttribute("script-no")
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

    // dark mode
    if (document.querySelector("body")?.getAttribute("theme") === "dark") {
      document.querySelector(".sidebar")?.classList.add("dark");
      document.querySelector(".topbar")?.classList.add("dark");
    } else {
      document.querySelector(".sidebar")?.classList.remove("dark");
    }

    if (!this.open) this._showMe();
  }
}
