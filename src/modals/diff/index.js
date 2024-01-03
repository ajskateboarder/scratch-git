import Cmp from "../../accessors";
import { html } from "../../utils";
import showDiffs from "./render";

const DIFF_MODAL = html`<dialog id="diffModal" style="overflow-x: hidden">
  <div class="content">
    <div class="topbar"></div>
    <div class="sidebar">
      <ul id="scripts"></ul>
      <br />
    </div>
    <div class="blocks">
      <p id="commits"></p>
      <div
        class="bottom-bar"
        style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
      >
        <select id="styleChoice">
          <option value="scratch3">Scratch 3.0</option>
          <option value="scratch2">Scratch 2.0</option>
          <option value="scratch3-high-contrast">
            Scratch 3.0 (High Contrast)
          </option>
        </select>
        <button
          onclick="document.querySelector('#diffModal').close()"
          class="${Cmp.SETTINGS_BUTTON}"
          id="commitButton"
        >
          Okay
        </button>
      </div>
    </div>
  </div>
</dialog>`;

export class DiffModal {
  /** @type {HTMLDialogElement} */
  #modal;
  /** @type {HTMLSelectElement} */
  #style;

  constructor() {
    document.body.innerHTML += DIFF_MODAL;
    this.#modal = document.querySelector("#diffModal");

    this.#style = document.querySelector("#styleChoice");
    this.#style.onchange = () => {
      (async () => {
        await this._rerender(this.#style.value);
      })();
    };
  }

  async display() {
    let project = await api.getCurrentProject();
    await project.unzip();

    globalThis.sprites = await project.getSprites();

    this.#style.value = "scratch3";

    showDiffs({
      modalElement: this.#modal,
      styleElement: this.#style,
      sprite: globalThis.sprites[0],
      style,
    });
  }

  async _rerender(style) {
    const activeButton = parseInt(
      document
        .querySelector("button.tab-btn.active-tab")
        .getAttribute("script-no")
    );
    await globalThis.diffs[activeButton].renderBlocks(style);
  }
}
