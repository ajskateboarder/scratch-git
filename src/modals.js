import Cmp from "./accessors";
import { html } from "./utils";
import { fileMenu } from "./gui-components";

window.modalSteps = {
  goToStep1: () =>
    (document.querySelector("#welcomeLog").innerHTML =
      WELCOME_MODAL_STEP_1(false)),
  goToStep2: () =>
    (document.querySelector("#welcomeLog").innerHTML = WELCOME_MODAL_STEP_2),
  goToStep3: (path) => {
    document.querySelector("#welcomeLog").innerHTML = WELCOME_MODAL_STEP_3;
  },
  openProjectPath: () =>
    document
      .querySelector("#nextButton2")
      .classList.remove(Cmp.DISABLED_BUTTON),
  openProject: () => {
    fileMenu.openProject();
    /** @type {HTMLButtonElement} */
    let nextButton = document.querySelector("#nextButton");
    nextButton.disabled = false;
    nextButton.classList.remove(Cmp.DISABLED_BUTTON);
  },
};

const DIALOG_CSS = `
  position: absolute;
  transform: translateX(-50%);
  width: 100%;
  left: 50%;
  text-align: center;
  max-height: 100%;
  overflow: hidden;
  word-wrap: break-word;
  white-space: normal;
  padding: 20px;
  box-sizing: border-box;
`;

const WELCOME_MODAL_STEP_1 = (disabled) => html`<div style="${DIALOG_CSS}">
  <h1>Welcome</h1>
  <div style="font-weight: normal">
    <p>Please load a project for Git development<br /><br /></p>
    <button
      onclick="modalSteps.openProject()"
      style="width: 50%"
      class="${Cmp.SETTINGS_BUTTON}"
    >
      Open project</button
    ><br /><br />
    <!-- TODO: make functional vv -->
    <input type="checkbox" name="dontshowagain" />
    <label for="dontshowagain"> Don't show again</label>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        onclick="document.querySelector('#welcomeLog').close()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Close
      </button>
      <button
        onclick="modalSteps.goToStep2()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${disabled ? Cmp.DISABLED_BUTTON : ""}"
        ${disabled ? "disabled" : ""}
        id="nextButton"
      >
        Next
      </button>
    </div>
  </div>
</div>`;

const WELCOME_MODAL_STEP_2 = html`
  <div style="${DIALOG_CSS}">
    <h1>Configure project location</h1>
    <div style="font-weight: normal">
      <p>
        Please enter the full path to your project. This is so scratch.git can
        find your project locally to use with your repository<br /><br />
      </p>
      <input
        type="file"
        id="pathInput"
        class="${Cmp.SETTINGS_BUTTON}"
        onclick="modalSteps.openProjectPath()"
        accept=".sb,.sb2,.sb3"
      />
    </div>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
        onclick="modalSteps.goToStep1()"
      >
        Back
      </button>
      <button
        onclick="modalSteps.goToStep3(document.querySelector('#pathInput').files[0].path)"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
        id="nextButton2"
      >
        Next
      </button>
    </div>
  </div>
`;

const WELCOME_MODAL_STEP_3 = html`
  <div style="${DIALOG_CSS}">
    <h1>Finish</h1>
    <div style="font-weight: normal">
      <p>Err IDK<br /><br /></p>
    </div>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
        onclick="document.querySelector('#welcomeLog').close()"
      >
        Close
      </button>
    </div>
  </div>
`;

export const WELCOME_MODAL = html`<dialog
  id="welcomeLog"
  style="overflow-x: hidden"
>
  ${WELCOME_MODAL_STEP_1(true)}
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
