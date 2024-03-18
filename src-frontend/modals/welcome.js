/** @file Template and logic for the project initialization modal */
import { html } from "../utils";
import { Cmp, fileMenu } from "../dom/index";
import api from "../api";

import thumbnail from "../media/thumb.svg";

/** Handles project initialization */
export class WelcomeModal extends HTMLDialogElement {
  /** @type {HTMLDivElement} */
  step1;
  /** @type {HTMLDivElement} */
  step2;
  /** @type {HTMLDivElement} */
  step3;

  constructor() {
    super();
    this.loadedProject = false;
  }

  connectedCallback() {
    if (this.querySelector("div") || this.querySelector("style")) return;
    this.innerHTML += html`<style>
      .thumbnail {
        filter: hue-rotate(90deg) saturate(1.3);
        display: flex;
        flex-grow: 1;
        justify-content: right;
        align-items: center;
      }
    </style>`;

    this.step1 = Object.assign(document.createElement("div"), {
      id: "welcomeStep1",
      style:
        "display: flex; flex-direction: column; padding: 20px; width: 100%",
      innerHTML: html`<div class="finishContent">
        <h1>Welcome to scratch.git!</h1>
        <p>
          Please load a project for Git development to get started.<br /><br />
        </p>
        <button
          id="openProject"
          style="width: 50%"
          class="${Cmp.SETTINGS_BUTTON}"
        >
          Open project
        </button>
        <!-- TODO: make functional vv -->&nbsp;
        <input type="checkbox" name="dontshowagain" />
        <label for="dontshowagain"> Don't show again</label>
        <br /><br />
        <div class="bottom-bar">
          <button
            style="align-items: right; margin-left: -10px; "
            class="${Cmp.SETTINGS_BUTTON}"
            id="exitWelcome"
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
      </div>`,
    });

    this.step2 = Object.assign(document.createElement("div"), {
      id: "welcomeStep2",
      style: "display: none; flex-direction: column; padding: 20px",
      innerHTML: html`<div class="finishContent">
        <h1>Configure project location</h1>
        <div style="font-weight: normal">
          <p>
            Please select the location of your project file. This is so
            scratch.git can find your project locally to use with your
            repository.<br /><br />
          </p>
          <input
            id="openProjectPath"
            type="file"
            class="${Cmp.SETTINGS_BUTTON}"
            accept=".sb,.sb2,.sb3"
          />
          <pre id="creationError" style="color: red; font-size: 14px"></pre>
        </div>
        <div class="bottom-bar">
          <button
            style="align-items: right; margin-left: -10px; "
            class="${Cmp.SETTINGS_BUTTON}"
            id="goToStep1"
          >
            Back
          </button>
          <button
            id="goToStep3"
            style="align-items: right; margin-left: -10px; "
            class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
            disabled
          >
            Next
          </button>
        </div>
      </div>`,
    });

    this.step3 = Object.assign(document.createElement("div"), {
      id: "welcomeStep3",
      style:
        "display: none; flex-direction: column; padding: 20px; width: 100%",
      innerHTML: html`<div class="finishContent">
        <h1>Welcome to scratch.git!</h1>
        <div style="font-weight: normal">
          <p>Err IDK<br /><br /></p>
        </div>
        <div class="bottom-bar">
          <button
            style="align-items: right; margin-left: -10px; "
            class="${Cmp.SETTINGS_BUTTON}"
            id="exitWelcome2"
          >
            Close
          </button>
        </div>
      </div>`,
    });

    this.append(this.step1);
    this.append(this.step2);
    this.append(this.step3);
    this.innerHTML += html`<span class="thumbnail">${thumbnail}</span>`;
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

  openProject() {
    fileMenu.openProject();
    window.vm.runtime.on("PROJECT_LOADED", () => {
      this.loadedProject = true;
      /** @type {HTMLButtonElement} */
      let nextButton = this.querySelector("#goToStep2");
      nextButton.disabled = false;
      nextButton.classList.remove(Cmp.DISABLED_BUTTON);
      this.querySelector(
        "#openProject"
      ).innerHTML = `<i class="fa-solid fa-check"></i> Project opened`;
      setTimeout(() => {
        this.querySelector("#openProject").innerHTML = "Open project";
      }, 2000);
    });
  }

  async display() {
    let path;
    this.querySelector("#exitWelcome").onclick = () => {
      this.close();
      if (this.loadedProject) window.location.reload();
    };
    this.querySelector("#exitWelcome2").onclick = () => {
      this.close();
      if (this.loadedProject) window.location.reload();
    };
    this.querySelector("#goToStep1").onclick = () => {
      this.querySelector("#welcomeStep2").style.display = "none";
      this.querySelector("#welcomeStep1").style.display = "flex";
    };
    this.querySelector("#goToStep2").onclick = () => {
      this.querySelector("#welcomeStep1").style.display = "none";
      this.querySelector("#welcomeStep2").style.display = "flex";
    };
    this.querySelector("#goToStep3").onclick = async () => {
      this.querySelector("#creationError").innerHTML = "";
      try {
        await api.createProject(path);
      } catch (e) {
        /** @type {import("../api").ProjectExistsException} */
        let err = e;
        if (err.name === "ProjectExistsException") {
          this.querySelector("#creationError").innerHTML = err.message;
          return;
        } else if (err.name === "Error") {
          this.querySelector("#creationError").innerHTML = err.message;
          throw err;
        }
      }
      this.querySelector("#welcomeStep2").style.display = "none";
      this.querySelector("#welcomeStep3").style.display = "flex";
    };
    this.querySelector("#openProject").onclick = () => this.openProject();
    this.querySelector("#openProjectPath").onchange = () => {
      this.querySelector("#goToStep3").disabled = false;
      this.querySelector("#goToStep3").classList.remove(Cmp.DISABLED_BUTTON);
      path = this.querySelector("#openProjectPath").files[0].path;
    };
    if (!this.open) {
      this._showMe();
    }
  }
}
