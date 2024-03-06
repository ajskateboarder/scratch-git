/** @file Template and logic for the project initialization modal */
import { html } from "../utils";
import { Cmp, fileMenu } from "../dom/index";
import api from "../api";

import thumbnail from "../media/thumb.svg";

const DIALOG_CSS = `text-align: center;`;

const WELCOME_MODAL_STEP_1 = html`<div id="welcomeStep1">
  <div class="finishContent">
    <h1>Welcome to scratch.git!</h1>
    <p>Please load a project for Git development to get started.<br /><br /></p>
    <button id="openProject" style="width: 50%" class="${Cmp.SETTINGS_BUTTON}">
      Open project
    </button>
    <!-- TODO: make functional vv -->&nbsp;
    <input type="checkbox" name="dontshowagain" />
    <label for="dontshowagain"> Don't show again</label>
    <br /><br />
    <div class="bottom-bar">
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
  <span class="thumbnail">${thumbnail}</span>
</div>`;

const WELCOME_MODAL_STEP_2 = html`
  <div style="${DIALOG_CSS}display: none" id="welcomeStep2">
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
  <div style="display: none" id="welcomeStep3">
    <div class="finishContent">
      <h1>Welcome to scratch.git!</h1>
      <div style="font-weight: normal">
        <p>Err IDK<br /><br /></p>
      </div>
      <div class="bottom-bar">
        <button
          style="align-items: right; margin-left: -10px; "
          class="${Cmp.SETTINGS_BUTTON}"
          onclick="document.querySelector('#welcomeModal').close()"
        >
          Close
        </button>
      </div>
    </div>
    <span class="thumbnail">${thumbnail}</span>
  </div>
`;

const WELCOME_MODAL = html`<dialog id="welcomeModal" style="overflow-x: hidden">
  ${WELCOME_MODAL_STEP_1} ${WELCOME_MODAL_STEP_2} ${WELCOME_MODAL_STEP_3}
</dialog>`;

export class WelcomeModal {
  constructor(root) {
    root.innerHTML += WELCOME_MODAL;
  }

  /** @returns {HTMLDialogElement} */
  get modal() {
    return document.querySelector("#welcomeModal");
  }

  display() {
    document.querySelector("#openProject").onclick = () => this.openProject();
    document.querySelector("#openProjectPath").onclick = () =>
      this.openProjectPath();
    document.querySelector("#goToStep1").onclick = () => this.goToStep1();
    document.querySelector("#goToStep2").onclick = () => this.goToStep2();
    document.querySelector("#goToStep3").onclick = () =>
      this.goToStep3(document.querySelector("#openProjectPath").files[0].path);
    if (!this.modal.open) {
      this.modal.showModal();
      this.updateResponsiveness();
      window.addEventListener("resize", () => this.updateResponsiveness());
    }
  }

  updateResponsiveness() {
    [...this.modal.querySelectorAll(".thumbnail")].map(
      (e) =>
        (e.style.transform = `scaleY(${Math.max(
          1,
          this.modal.offsetHeight / 215
        )}) scaleX(${Math.min(this.modal.offsetHeight / 215, 3)})`)
    );
    [...this.modal.querySelectorAll(".finishContent")].map(
      (e) =>
        (e.style.width =
          (this.modal.clientWidth + this.modal.clientHeight) / 2 -
          this.modal.querySelector(".thumbnail").clientWidth -
          40 +
          "px")
    );
  }

  // Can't say this is less verbose than simply swapping HTML
  // but hey, at least I control state better, or something

  goToStep1() {
    this.modal.querySelector("#welcomeStep2").style.display = "none";
    this.modal.querySelector("#welcomeStep1").style.display = "block";
    this.updateResponsiveness();
    window.addEventListener("resize", () => this.updateResponsiveness());
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
    this.updateResponsiveness();
    window.addEventListener("resize", () => this.updateResponsiveness());
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

    window.vm.runtime.on("PROJECT_LOADED", () => {
      document.querySelector(
        "#openProject"
      ).innerHTML = `<i class="fa-solid fa-check"></i> Project opened`;
      setTimeout(() => {
        document.querySelector("#openProject").innerHTML = `Open project`;
      }, 2000);
    });
  }
}
