import { settings, misc } from "@/components";
import van, { PropsWithKnownKeys, type State } from "vanjs-core";
import tippy from "tippy.js";
import { remoteExists } from "@/api";

const { main, button, h1, div, span, input, label, br, p } = van.tags;

const PENCIL = document
  .querySelector(`.${misc.menuItems}`)!
  .children[2].children[0].cloneNode() as HTMLImageElement;

function isValidUrl(url: string) {
  try {
    return Boolean(new URL(url));
  } catch (_) {
    return false;
  }
}

const InputField = (...children: any[]) =>
  p({ style: "display: flex; align-items: center; gap: 10px" }, children);

const InputBox = (props: PropsWithKnownKeys<HTMLInputElement>) =>
  input({
    ...props,
    type: "text",
    style: "border-radius: 5px; width: 275px",
    class: settings.inputField,
  });

export class RepoConfigModal extends HTMLDialogElement {
  gitProvider!: string;
  editing!: State<boolean>;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.gitProvider = localStorage.getItem("scratch-git:repo-provider") ?? "";
    this.editing = van.state(false);

    const closeButton = button(
      {
        class: settings.settingsButton,
        style: "margin-left: 10px",
        onclick: () => this.close(),
      },
      "Close"
    );

    const provider = InputBox({
      placeholder: "Enter a link to a repository URL",
      onblur: async ({ target }: Event) => {
        let url: string = (target as HTMLInputElement).value;
        if (this.editing.val === true) {
          if (isValidUrl(url) && (await remoteExists(url))) {
            localStorage.setItem("scratch-git:repo-provider", url);
            this.gitProvider = localStorage.getItem(
              "scratch-git:repo-provider"
            )!;
          } else {
            provider.value = "";
          }
        }
      },
    });

    const name = InputBox({
      placeholder: "Enter a username you want to use for this repository",
      onblur: async ({ target }: Event) => {
        let url: string = (target as HTMLInputElement).value;
        if (this.editing.val === true) {
          if (isValidUrl(url) && (await remoteExists(url))) {
            localStorage.setItem("scratch-git:name", url);
            this.gitProvider = localStorage.getItem("scratch-git:username")!;
          } else {
            provider.value = "";
          }
        }
      },
    });

    const editButton = button(
      {
        class: settings.settingsButton,
        style:
          "display: flex; padding: 0.4rem; margin-left: auto; align-items: center",
        onclick: () => {
          if (!this.editing.val) {
            this.editing.val = true;
            editButton.innerHTML = `<i class="fa-solid fa-floppy-disk floppy-save-button"></i>`;
          } else {
            this.editing.val = false;
            editButton.innerHTML = "";
            editButton.appendChild(PENCIL);
          }
        },
      },
      PENCIL
    );

    van.derive(() => {
      if (this.editing.oldVal !== this.editing.val) {
        if (!this.editing.val) {
          provider.classList.add("disabled-config-input");
        } else {
          provider.classList.remove("disabled-config-input");
        }
      }
    });

    van.add(
      this,
      main(
        { id: "commitList" },
        h1(
          { style: "display: flex; gap: 10px" },
          "Configure your ",
          span(
            {
              class: "tip",
              id: "repositoryTip",
            },
            "repository"
          ),
          editButton
        ),
        InputField(label("Repository URL:"), provider),
        InputField(label("Name:"), provider),
        br(),
        br(),
        div(
          {
            class: "bottom-bar",
            style: "margin: 0; padding: 0; bottom: 10px; margin-left: 10px",
          },
          closeButton
        )
      )
    );

    provider.classList.add("disabled-config-input");
  }

  display() {
    tippy("#repositoryTip", {
      content: "A repository (repo) is a place to store your project online",
      arrow: false,
      appendTo: this,
    });
    if (!this.open) this.showModal();
  }
}
