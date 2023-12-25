import Cmp from "./components";
import { html } from "./utils";

export const WELCOME_MODAL = html`<dialog
  id="welcomeLog"
  style="overflow-x: hidden"
>
  <div
    style="
position: absolute;
transform: translateX(-50%);
width: 100%;
left: 50%;
text-align: center;
height: 100%;
"
  >
    <h1>Welcome!</h1>
    <div style="font-weight: normal">
      <p>Please configure a project to use with Git</p>
      <input type="checkbox" name="dontshowagain" />
      <label for="dontshowagain"> Don't show again</label>
    </div>
    <div class="bottom-bar" style="justify-content: center; gap: 20px">
      <button
        onclick="document.querySelector('#welcomeLog').close()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Close
      </button>
      <button
        onclick="window.fileMenu.openProject(); document.querySelector('#welcomeLog').close()"
        style="align-items: right; margin-left: -10px;"
        class="${Cmp.SETTINGS_BUTTON}"
      >
        New Project
      </button>
      <button
        onclick="window.fileMenu.openProject(); document.querySelector('#welcomeLog').close()"
        style="align-items: right; margin-left: -10px;"
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Open project
      </button>
    </div>
  </div>
</dialog>`;

export const DIFF_MODAL = html`<dialog
  id="commitLog"
  style="overflow-x: hidden"
>
  <div class="content">
    <div class="topbar"></div>
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
          class="${Cmp.SETTINGS_BUTTON}"
          id="commitButton"
        >
          Okay
        </button>
      </div>
    </div>
  </div>
</dialog>`;

export const COMMIT_MODAL = html`<dialog
  id="allcommitLog"
  style="overflow-x: hidden"
>
  <div
    style="
position: absolute;
left: 47%;
transform: translateX(-50%);
width: 65%;
"
  >
    <h1>Commits</h1>
    <div class="pagination"></div>
    <br />
    <div class="commit-group"></div>
    <div
      class="bottom-bar"
      style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
    >
      <button
        onclick="document.querySelector('#allcommitLog').close()"
        class="${Cmp.SETTINGS_BUTTON}"
        id="commitButton"
      >
        Okay
      </button>
    </div>
  </div>
</dialog>`;
