import { html, diff } from "../../utils";
import Cmp from "../../accessors";
import api from "../../api";

import { parseScripts } from "./block-parser";

class DiffModal extends HTMLDialogElement {
  constructor() {
    super();
  }

  connectedCallback() {
    if (!this.querySelector(".content")) {
      this.innerHTML += html`<div class="content">
        <div class="topbar"></div>
        <div class="sidebar">
          <br />
        </div>
        <div class="blocks">
          <div
            class="bottom-bar"
            style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
          >
            <button
              onclick="document.querySelector('#diffModal').close()"
              class="${Cmp.SETTINGS_BUTTON}"
              id="commitButton"
            >
              Okay
            </button>
          </div>
        </div>
      </div>`;
      this.scripts = document.createElement("ul", { id: "scripts" });
      this.querySelector(".sidebar").prepend(this.scripts);
      this.commits = document.createElement("p", { id: "commits" });
      this.querySelector(".blocks").prepend(this.commits);
    }
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    let fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`).appendChild(fragment);
    document.querySelector("#diffModal").showModal();
  }

  /**
   * @param {string} sprite
   * @param {number} script - 0 by default
   */
  async diff(sprite, script = 0) {
    let project = await api.getCurrentProject();
    let sprites = await project.getSprites();
    project.unzip();
    const oldProject = await project.getPreviousScripts(sprite);
    const newProject = await project.getCurrentScripts(sprite);

    let scripts = parseScripts(oldProject, newProject);
    let diffs = (
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
    this.commits.innerText = diffs[script].diffed;

    this._showMe();
  }
}

customElements.define("diff-modal", DiffModal, { extends: "dialog" });
