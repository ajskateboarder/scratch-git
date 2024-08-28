import van from "vanjs-core";
import api, { cloneRepo, remoteExists } from "@/api";
import { settings, fileMenu, cls } from "@/components";
import { InputBox, InputField } from "@/components";
import { Redux, vm } from "@/lib";
import { validEmail, validURL } from "@/utils";
import { Modal } from "../base";
import thumbnail from "./thumbnail.svg";

const { div, h1, button, p, br, span, input, pre, i, label, a, form } =
  van.tags;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (step: { number: number; title: string }, ...children: any) =>
  div(
    { class: "screen", id: `step${step.number}` },
    div({ class: "welcome-screen-content" }, h1(step.title), children)
  );

const CLONE_ERROR = {
  [-1]: "An error occurred while trying to clone this repository.",
  [-2]: "This repository is not a valid Scratch project.",
  [-3]: "This repository uses costumes or sounds that don't exist.",
  [-4]: "You have already cloned this repository.",
};

/** Project initialization */
export class WelcomeModal extends Modal {
  $steps: Element[] = [];

  loadedProject: boolean = false;
  currentStep = van.state(0);

  projectName?: string;
  projectPath?: string;

  connectedCallback() {
    if (this.querySelector("div")) return;
    this.$steps = [this.$step1(), this.$step2(), this.$step3(), this.$step4()];

    const thumb = span({ class: "thumbnail" }, thumbnail());

    if (!this.querySelector(".screen")) {
      van.add(this, this.$steps[this.currentStep.val], thumb);
    }

    van.derive(() => {
      this.querySelector(".screen")?.remove();
      van.add(this, this.$steps[this.currentStep.val], thumb);
      this.querySelector<HTMLDivElement>(".screen")!.style.display = "flex";
    });
  }

  public async display() {
    if (!this.open) {
      this.$steps = [
        this.$step1(),
        this.$step2(),
        this.$step3(),
        this.$step4(),
      ];
      this.currentStep.val = 0;
      this.showModal();
    }
  }

  /** Open a project */
  private $step1() {
    const loadState = van.state(true);

    const goToStep2 = button(
      {
        class: cls(settings.button, settings.disabledButton, "back-button"),
        disabled: true,
        onclick: () => ++this.currentStep.val,
      },
      "Next"
    );

    const openProject = van.derive(() => {
      if (loadState.val) {
        return button(
          {
            style: "width: 50%",
            class: settings.button,
            onclick: () => {
              fileMenu.openProject();
              vm.runtime.on("PROJECT_LOADED", async () => {
                this.loadedProject = true;
                setTimeout(async () => {
                  if (await api.getCurrentProject()?.exists()) {
                    goToStep2.disabled = false;
                    goToStep2.style.cursor = "help";
                    goToStep2.title = "This project has been made already";
                  } else {
                    goToStep2.disabled = true;
                    goToStep2.style.cursor = "unset";
                    goToStep2.title = "";
                  }
                  goToStep2.classList.remove(settings.disabledButton);
                  openProject.val.innerHTML = `<i class="fa-solid fa-check"></i> Project opened"
                  )}`;
                });
                setTimeout(() => {
                  openProject.val.innerHTML = "Open project";
                }, 2000);
              });
            },
          },
          "Open project"
        );
      } else {
        const $url = InputBox({
          placeholder: "https://link.to.repo/username/repo",
          onblur: () => {
            $submit.disabled = !validURL($url.value);
          },
        });

        const $submit = button(
          {
            class: settings.button,
            disabled: true,
            onclick: async () => {
              if ($submit.disabled) return;
              $url.setCustomValidity("");

              if (!(await remoteExists($url.value))) {
                $url.setCustomValidity(
                  "This repository doesn't exist or it's private."
                );
                $url.reportValidity();
                return;
              }

              $submit.innerHTML = "";
              $submit.appendChild(
                span(i({ class: "fa-solid fa-sync fa-spin" }), " ", "Cloning")
              );

              let response = await cloneRepo($url.value);
              $submit.innerText = "Clone";
              if (response.success === false) {
                $url.setCustomValidity(
                  CLONE_ERROR[response.reason as keyof typeof CLONE_ERROR]
                );
                $url.reportValidity();
                return;
              }

              // should i use something other than alert?
              alert(`Project saved at ${response.path}`);
              loadState.val = true;
            },
          },
          "Clone"
        );

        return form(
          { style: "display: flex; width: 100%; gap: 10px" },
          InputField({ style: "flex-grow: 1" }, $url),
          $submit
        );
      }
    });

    return Screen(
      { title: "Welcome to scratch.git", number: 1 },
      div(
        { style: "font-weight: normal" },
        p(
          () =>
            loadState.val
              ? "Please load a project for Git development to get started"
              : "Please load a project for development from a Git repository link to get started",
          br(),
          br()
        ),
        div({ class: "a-gap" }, () => openProject.val),
        br(),
        a(
          {
            style:
              "color: var(--menu-bar-background-default); font-weight: bold",
            onclick: () => (loadState.val = !loadState.val),
          },
          () =>
            loadState.val
              ? "or clone a repository from online"
              : "or load an existing project from your computer"
        ),
        br(),
        br()
      ),
      BottomBar(
        button(
          {
            class: cls(settings.button, "back-button"),
            onclick: () => {
              this.close();
              if (this.loadedProject) {
                // nothing is changed at this point so ignore warnings
                window.onbeforeunload = () => {};
                window.location.reload();
              }
            },
          },
          "Close"
        ),
        goToStep2
      )
    );
  }

  /** Input the project's location for our purposes */
  private $step2() {
    const goToStep3 = button(
      {
        class: cls(settings.button, settings.disabledButton, "back-button"),
        disabled: true,
        onclick: async () => {
          this.projectName = Redux.getState().scratchGui.projectTitle;
          ++this.currentStep.val;
        },
      },
      "Next"
    );

    const openProjectPath = input({
      type: "file",
      class: settings.button,
      accept: ".sb,.sb2,.sb3",
      onchange: () => {
        goToStep3.disabled = false;
        goToStep3.classList.remove(settings.disabledButton);
        // .path is an electron-specific attr
        this.projectPath = (openProjectPath.files![0] as any).path;
      },
    });

    return Screen(
      { title: "Select project file", number: 2 },
      div(
        { class: "welcome-screen-content" },
        p(
          "Please select the location of your Scratch project file.",
          br(),
          br()
        ),
        openProjectPath
      ),
      BottomBar(
        button(
          {
            class: cls(settings.button, "back-button"),
            onclick: () => --this.currentStep.val,
          },
          "Back"
        ),
        goToStep3
      )
    );
  }

  private $step3() {
    let username: string;
    let email: string;

    const $creationError = pre({ id: "stepError" });

    const goToStep4 = button(
      {
        class: cls(settings.button, settings.disabledButton, "back-button"),
        disabled: true,
        onclick: async () => {
          try {
            await api.createProject({
              projectPath: this.projectPath!,
              username,
              email,
            });
            ++this.currentStep.val;
          } catch {
            $creationError.innerHTML = "";
            $creationError.appendChild(
              span(i({ class: "fa fa-solid fa-circle-exclamation" }), " ")
            );
            return;
          }
        },
      },
      "Next"
    );

    const disableIfEmptyFields = () => {
      if (
        username === undefined ||
        username === "" ||
        email === undefined ||
        email === ""
      ) {
        goToStep4.disabled = true;
        goToStep4.classList.add(settings.disabledButton);
      } else {
        goToStep4.disabled = false;
        goToStep4.classList.remove(settings.disabledButton);
      }
    };

    const $username = InputField(
      {},
      label({ class: "input-label" }, "Name"),
      InputBox({
        onblur: (e: Event) => {
          username = (e.target! as HTMLInputElement).value;
          disableIfEmptyFields();
        },
      })
    );

    const $email = InputField(
      {},
      label({ class: "input-label" }, "Email"),
      InputBox({
        onblur: (e: Event) => {
          email = (e.target! as HTMLInputElement).value;
          if (!validEmail(email)) {
            $email.querySelector("input")!.value = "";
            email = "";
          }
          disableIfEmptyFields();
        },
      })
    );

    return Screen(
      { title: "Enter a username and email", number: 3 },
      div(
        { class: "welcome-screen-content" },
        p(
          "Please pick a username and email to use when making commits. Remember to keep this info appropriate if you want to share your repository on Scratch. Your email is only used for Git and doesn't have to be a real email.",
          br(),
          br()
        ),
        $username,
        br(),
        $email,
        $creationError,
        BottomBar(
          button(
            {
              class: cls(settings.button, "back-button"),
              onclick: () => --this.currentStep.val,
            },
            "Back"
          ),
          goToStep4
        )
      )
    );
  }

  private $step4() {
    return Screen(
      { title: "Welcome to scratch.git", number: 3 },
      div(
        { class: "welcome-screen-content" },
        p("To be written", br(), br()),
        BottomBar(
          button(
            {
              class: cls(settings.button, "back-button"),
              onclick: () => this.close(),
            },
            "Close"
          )
        )
      )
    );
  }

  public refresh() {
    this.currentStep.val = 0;
    this.querySelectorAll(".screen").forEach((e) => e.remove());
    this.querySelector(".thumbnail")!.remove();
    this.connectedCallback();
  }
}
