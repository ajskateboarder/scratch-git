import { Modal } from "../base";
import thumbnail from "../thumbnail.svg";
import api, { cloneRepo, remoteExists } from "@/api";
import { settings, fileMenu } from "@/components";
import { InputBox, InputField } from "@/components";
import i18next from "@/i18n";
import { Redux, VM } from "@/lib";
import { validEmail, validURL } from "@/utils";
import van, { type State } from "vanjs-core";

const { div, h1, button, p, br, span, input, pre, i, label, a, form } =
  van.tags;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (step: { number: number; title: string }, ...children: any) =>
  div(
    { class: "screen", id: `step${step.number}` },
    div({ class: "welcome-screen-content" }, h1(step.title), children)
  );

// TODO: localize!?
const CLONE_ERROR = {
  [-1]: "An error occurred while trying to clone this repository",
  [-2]: "This repository doesn't have a project.json",
  [-3]: "This repository uses assets that don't exist",
  [-4]: "You have already cloned this repository",
};

/** Project initialization */
export class WelcomeModal extends Modal {
  $steps: Element[] = [];

  loadedProject: boolean = false;
  currentStep: State<number> = van.state(0);

  projectName?: string;
  projectPath?: string;

  connectedCallback() {
    if (this.querySelector("div") || this.querySelector("style")) return;
    this.$steps = [this.$step1(), this.$step2(), this.$step3(), this.$step4()];

    const thumb = span(
      { class: "thumbnail" },
      new DOMParser().parseFromString(thumbnail, "image/svg+xml")
        .documentElement
    );

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
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: () => ++this.currentStep.val,
      },
      i18next.t("welcome.next")
    );

    const openProject = van.derive(() => {
      if (loadState.val) {
        return button(
          {
            style: "width: 50%",
            class: settings.settingsButton,
            onclick: () => {
              fileMenu.openProject();
              VM.on("PROJECT_LOADED", async () => {
                this.loadedProject = true;
                if ((await api.getCurrentProject())?.exists()) {
                  goToStep2.disabled = true;
                  goToStep2.style.cursor = "help";
                  // TODO: localize
                  goToStep2.title =
                    "This project has been configured already so there's no need to continue";
                } else {
                  goToStep2.disabled = false;
                  goToStep2.style.cursor = "unset";
                  goToStep2.title = "";
                }
                goToStep2.classList.remove(settings.disabledButton);
                openProject.val.innerHTML = `<i class="fa-solid fa-check"></i> ${i18next.t(
                  "welcome.project-opened"
                )}`;
                setTimeout(() => {
                  openProject.val.innerHTML = i18next.t("welcome.open-project");
                }, 2000);
              });
            },
          },
          i18next.t("welcome.open-project")
        );
      } else {
        const $url = InputBox({
          placeholder: "https://link.to.repo/username/repo",
          onblur: () => {
            $submit.disabled = !validURL($url.value);
          },
        });

        // TODO: localize!!!
        const $submit = button(
          {
            class: settings.settingsButton,
            disabled: true,
            onclick: async () => {
              if ($submit.disabled) return;
              $url.setCustomValidity("");

              if (!(await remoteExists($url.value))) {
                $url.setCustomValidity(
                  "Repository doesn't exist or is private"
                );
                $url.reportValidity();
                return;
              }

              $submit.innerHTML = "";
              $submit.appendChild(
                span(i({ class: "fa-solid fa-sync fa-spin" }), " Cloning")
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

              alert(`Project saved at ${response.path}`); // should i use something other than alert? ehh..
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
      { title: i18next.t("welcome.welcome"), number: 1 },
      div(
        { style: "font-weight: normal" },
        // TODO: localize
        p(
          () =>
            loadState.val
              ? i18next.t("welcome.get-started")
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
          // TODO: localize
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
            style: "align-items: right: margin-left: -10px",
            class: settings.settingsButton,
            onclick: () => {
              this.close();
              if (this.loadedProject) window.location.reload();
            },
          },
          i18next.t("close")
        ),
        goToStep2
      )
    );
  }

  /** Input the project's location for our purposes */
  private $step2() {
    const goToStep3 = button(
      {
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: async () => {
          this.projectName = Redux.getState().scratchGui.projectTitle;
          ++this.currentStep.val;
        },
      },
      i18next.t("welcome.next")
    );

    const openProjectPath = input({
      type: "file",
      class: settings.settingsButton,
      accept: ".sb,.sb2,.sb3",
      onchange: () => {
        goToStep3.disabled = false;
        goToStep3.classList.remove(settings.disabledButton);
        // .path is an electron-specific attr
        this.projectPath = (openProjectPath.files![0] as any).path;
      },
    });

    return Screen(
      { title: i18next.t("welcome.select-project-loc"), number: 2 },
      div(
        { class: "welcome-screen-content" },
        p(i18next.t("welcome.select-location"), br(), br()),
        openProjectPath
      ),
      BottomBar(
        button(
          {
            style: "align-items: right; margin-left: -10px",
            class: settings.settingsButton,
            onclick: () => --this.currentStep.val,
          },
          i18next.t("welcome.back")
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
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
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
      i18next.t("welcome.next")
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
      label({ class: "input-label" }, i18next.t("repoconfig.name")),
      InputBox({
        onblur: (e: Event) => {
          username = (e.target! as HTMLInputElement).value;
          disableIfEmptyFields();
        },
      })
    );

    const $email = InputField(
      {},
      label({ class: "input-label" }, i18next.t("repoconfig.email")),
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
      { title: i18next.t("welcome.set-info"), number: 3 },
      div(
        { class: "welcome-screen-content" },
        p(i18next.t("welcome.set-git-username"), br(), br()),
        $username,
        br(),
        $email,
        $creationError,
        BottomBar(
          button(
            {
              style: "align-items: right; margin-left: -10px",
              class: settings.settingsButton,
              onclick: () => --this.currentStep.val,
            },
            i18next.t("welcome.back")
          ),
          goToStep4
        )
      )
    );
  }

  private $step4() {
    return Screen(
      { title: i18next.t("welcome.welcome"), number: 3 },
      div(
        { class: "welcome-screen-content" },
        p("To be written", br(), br()),
        BottomBar(
          button(
            {
              style: "align-items: right; margin-left: -10px",
              class: settings.settingsButton,
              onclick: () => this.close(),
            },
            i18next.t("close")
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
