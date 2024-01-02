/** @file Template and logic for the project initialization modal */
import { fileMenu } from "../gui-components";


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
      id="openProject"
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
        onclick="document.querySelector('#welcomeModal').close()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Close
      </button>
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${disabled ? Cmp.DISABLED_BUTTON : ""}"
        ${disabled ? "disabled" : ""}
        id="goToStep2"
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
        id="openProjectPath"
        type="file"
        class="${Cmp.SETTINGS_BUTTON}"
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
        id="gotoStep1"
      >
        Back
      </button>
      <button
        id="goToStep3"
        onclick="modalSteps.goToStep3()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
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
        onclick="document.querySelector('#welcomeModal').close()"
      >
        Close
      </button>
    </div>
  </div>
`;


const WELCOME_MODAL = html`<dialog
  id="welcomeModal"
  style="overflow-x: hidden"
>
  ${WELCOME_MODAL_STEP_1(true)}
</dialog>`;

class WelcomeModal {
  #modal

  constructor() {
    document.body.innerHTML += WELCOME_MODAL
    this.#modal = document.querySelector("#welcomeModal")
    document.querySelector("#openProject").onclick = this.openProject
    document.querySelector("#openProjectPath").onclick = this.openProjectPath
    document.querySelector("#goToStep1").onclick = this.goToStep1
    document.querySelector("#goToStep2").onclick = this.goToStep2
    document.querySelector("#goToStep3").onclick = () => this.goToStep3(document.querySelector('#pathInput').files[0].path)
  }

  display() {
    if (!this.#modal.open) {
      this.#modal.showModal();
    }
  }

  goToStep1() {
    this.#modal.innerHTML = WELCOME_MODAL_STEP_1(false)
  }

  goToStep2() {
    this.#modal.innerHTML = WELCOME_MODAL_STEP_2
  }

  goToStep3(path) {
    (async () => {
      await API.createProject(path);
      this.#modal.innerHTML = WELCOME_MODAL_STEP_3;
    })();
  }

  openProjectPath() {
    document
      .querySelector("#nextButton2")
      .classList.remove(Cmp.DISABLED_BUTTON)
  }

  openProject() {
    fileMenu.openProject();
    /** @type {HTMLButtonElement} */
    let nextButton = document.querySelector("#nextButton");
    nextButton.disabled = false;
    nextButton.classList.remove(Cmp.DISABLED_BUTTON);
  }
}


export default new WelcomeModal()
