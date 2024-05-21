import api, { ProjectExistsException } from "@/api";
import { settings, fileMenu } from "@/components";
import thumbnail from "./thumbnail.svg.ts";
import van, { type State } from "vanjs-core";
import i18next from "@/i18n";
import { Redux, VM } from "@/lib";
import { Modal } from "./base.ts";
import { InputBox, InputField } from "@/components";

const { div, h1, button, p, br, span, input, pre, i, label } = van.tags;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (step: { number: number; title: string }, ...children: any) =>
  div(
    { class: "screen", id: `step${step.number}` },
    div({ class: "welcome-screen-content" }, h1(step.title), children)

/** Test if an email is valid or not.
 *
 * Obviously, this won't cover all edge cases, but this will stop blatantly wrong ones */
const isValidEmail = (email: string) => {
  return String(email)
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

/** Project initialization */
export class WelcomeModal extends Modal {
  $steps: Element[] = [];

  loadedProject: boolean = false;
  currentStep: State<number> = van.state(0);

  projectName?: string;
  projectPath?: string;

  constructor() {
    super();
  }

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
    const goToStep2 = button(
      {
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: () => ++this.currentStep.val,
      },
      i18next.t("welcome.next")
    );

    const openProject = button(
      {
        style: "width: 50%",
        class: settings.settingsButton,
        onclick: () => {
          fileMenu.openProject();
          VM.on("PROJECT_LOADED", () => {
            this.loadedProject = true;
            (goToStep2 as HTMLButtonElement).disabled = false;
            goToStep2.classList.remove(settings.disabledButton);
            openProject.innerHTML = `<i class="fa-solid fa-check"></i> ${i18next.t(
              "welcome.project-opened"
            )}`;
            setTimeout(() => {
              openProject.innerHTML = i18next.t("welcome.open-project");
            }, 2000);
          });
        },
      },
      i18next.t("welcome.open-project")
    );

    return Screen(
      { title: i18next.t("welcome.welcome"), number: 1 },
      div(
        { style: "font-weight: normal" },
        p(i18next.t("welcome.get-started"), br(), br()),
        div({ class: "a-gap" }, openProject),
        br(),
        br()
      ),
      BottomBar(
        button(
          {
            style: "align-items: right: margin-left: -10px",
            class: settings.settingsButton,
            onclick: () => this.close(),
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
        this.projectPath = (openProjectPath.files![0] as any).path; // .path is an electron-specific attr
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
          } catch (e: unknown) {
            let err = e as ProjectExistsException;
            $creationError.innerHTML = "";
            $creationError.append(
              span(
                i({ class: "fa fa-solid fa-circle-exclamation" }),
                " ",
                err.message
              )
            );
            if (err.name === "Error") throw err;
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
      label({ class: "input-label" }, i18next.t("repoconfig.name")),
      InputBox({
        onblur: (e: Event) => {
          username = (e.target! as HTMLInputElement).value;
          disableIfEmptyFields();
        },
      })
    );

    const $email = InputField(
      label({ class: "input-label" }, i18next.t("repoconfig.email")),
      InputBox({
        onblur: (e: Event) => {
          email = (e.target! as HTMLInputElement).value;
          if (!isValidEmail(email)) {
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
