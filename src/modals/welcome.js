/** @file Template and logic for the project initialization modal */
import { fileMenu } from "../gui-components";
import { html } from "../utils";
import Cmp from "../accessors";
import api from "../api";

const DIALOG_CSS = `text-align: center; display: none`;

const WELCOME_MODAL_STEP_1 = html`<div style="${DIALOG_CSS}" id="welcomeStep1">
  <h1>Welcome</h1>
  <div style="font-weight: normal">
    <p>Please load a project for Git development<br /><br /></p>
    <button id="openProject" style="width: 50%" class="${Cmp.SETTINGS_BUTTON}">
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
        class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
        disabled
        id="goToStep2"
      >
        Next
      </button>
    </div>
  </div>
</div>`;

const WELCOME_MODAL_STEP_2 = html`
  <div style="${DIALOG_CSS}" id="welcomeStep2">
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
        id="goToStep1"
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
  <div style="${DIALOG_CSS}" id="welcomeStep3">
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

const WELCOME_MODAL = html`<dialog id="welcomeModal" style="overflow-x: hidden">
  ${WELCOME_MODAL_STEP_1} ${WELCOME_MODAL_STEP_2} ${WELCOME_MODAL_STEP_3}
</dialog>`;

export class WelcomeModal {
  modal;

  constructor(root) {
    root.innerHTML += WELCOME_MODAL;
    this.modal = document.querySelector("#welcomeModal");
    document.querySelector("#openProject").onclick = () => this.openProject();
    document.querySelector("#openProjectPath").onclick = () =>
      this.openProjectPath();
    document.querySelector("#goToStep1").onclick = () => this.goToStep1();
    document.querySelector("#goToStep2").onclick = () => this.goToStep2();
    document.querySelector("#goToStep3").onclick = () =>
      this.goToStep3(document.querySelector("#openProjectPath").files[0].path);
    document.querySelector("#goToStep1").style.display = "block";
  }

  display() {
    if (!this.modal.open) {
      this.modal.showModal();
    }
  }

  // Can't say this is less verbose than simply swapping HTML
  // but hey, at least I control state better, or something

  goToStep1() {
    this.modal.querySelector("#welcomeStep2").style.display = "none";
    this.modal.querySelector("#welcomeStep1").style.display = "block";
  }

  goToStep2() {
    this.modal.querySelector("#welcomeStep3").style.display = "none";
    this.modal.querySelector("#welcomeStep1").style.display = "none";
    this.modal.querySelector("#welcomeStep2").style.display = "block";
  }

  goToStep3(path) {
    (async () => {
      await api.createProject(path);
      this.modal.querySelector("#welcomeStep2").style.display = "none";
      this.modal.querySelector("#welcomeStep3").style.display = "block";
    })();
  }

  openProjectPath() {
    document.querySelector("#goToStep3").classList.remove(Cmp.DISABLED_BUTTON);
  }

  openProject() {
    fileMenu.openProject();
    /** @type {HTMLButtonElement} */
    let nextButton = document.querySelector("#goToStep2");
    nextButton.disabled = false;
    nextButton.classList.remove(Cmp.DISABLED_BUTTON);
  }
}
