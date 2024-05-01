import api, { ProjectExistsException } from "../api.ts";
import { settings, fileMenu } from "../dom/index.ts";
// @ts-ignore
import thumbnail from "./thumbnail.svg";
import van, { type State } from "vanjs-core";

const {
  tags: { div, h1, button, p, br, span, input, pre, i },
} = van;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (
  {
    stepNumber,
    title,
  }: {
    stepNumber: number;
    title: string;
  },
  ...children: any
) =>
  div(
    { class: "screen", id: `step${stepNumber}` },
    div({ class: "finishContent" }, h1(title), children)
  );

/** Project initialization */
export class WelcomeModal extends HTMLDialogElement {
  steps: Element[] = [];
  loadedProject: boolean = false;
  currentStep: State<number> = van.state(0);

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("div") || this.querySelector("style")) return;
    this.steps = [this.step1(), this.step2(), this.step3()];

    const thumb = span(
      { class: "thumbnail" },
      new DOMParser().parseFromString(thumbnail, "image/svg+xml")
        .documentElement
    );

    if (!this.querySelector(".screen")) {
      van.add(this, this.steps[this.currentStep.val], thumb);
    }

    van.derive(() => {
      this.querySelector(".screen")?.remove();
      van.add(this, this.steps[this.currentStep.val], thumb);
      this.querySelector<HTMLDivElement>(".screen")!.style.display = "flex";
    });
  }

  async display() {
    if (!this.open) {
      this.steps = [this.step1(), this.step2(), this.step3()];
      this.currentStep.val = 0;
      this.showModal();
    }
  }

  step1() {
    const goToStep2 = button(
      {
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: () => ++this.currentStep.val,
      },
      "Next"
    );

    const openProject = button(
      {
        style: "width: 50%",
        class: settings.settingsButton,
        onclick: () => {
          fileMenu.openProject();
          window.vm.runtime.on("PROJECT_LOADED", () => {
            this.loadedProject = true;
            (goToStep2 as HTMLButtonElement).disabled = false;
            goToStep2.classList.remove(settings.disabledButton);
            openProject.innerHTML = `<i class="fa-solid fa-check"></i> Project opened`;
            setTimeout(() => {
              openProject.innerHTML = "Open project";
            }, 2000);
          });
        },
      },
      "Open project"
    );

    return Screen(
      { title: "Welcome to scratch.git", stepNumber: 1 },
      div(
        { style: "font-weight: normal" },
        p(
          "Please load a project for Git development to get started",
          br(),
          br()
        ),
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
          "Close"
        ),
        goToStep2
      )
    );
  }

  step2() {
    let path: string;

    const creationError = pre({ id: "creationError" });

    const goToStep3 = button(
      {
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: async () => {
          try {
            await api.createProject(path);
          } catch (e: unknown) {
            creationError.innerHTML = "";
            let err = e as ProjectExistsException;
            creationError.append(
              span(
                i({ class: "fa fa-solid fa-circle-exclamation" }),
                " ",
                err.message
              )
            );
            if (err.name === "Error") throw err;
            return;
          }
          ++this.currentStep.val;
        },
      },
      "Next"
    );

    const openProjectPath = input({
      type: "file",
      class: settings.settingsButton,
      accept: ".sb,.sb2,.sb3",
      onchange: () => {
        goToStep3.disabled = false;
        goToStep3.classList.remove(settings.disabledButton);
        path = (openProjectPath.files![0] as any).path; // .path is an electron-specific attr
      },
    });

    return Screen(
      { title: "Configure project location", stepNumber: 2 },
      div(
        { class: "finishContent" },
        p(
          "Please select the location of your project file. This is so scratch.git can find your project locally to use with your repository.",
          br(),
          br()
        ),
        openProjectPath,
        creationError
      ),
      BottomBar(
        button(
          {
            style: "align-items: right; margin-left: -10px",
            class: settings.settingsButton,
            onclick: () => --this.currentStep.val,
          },
          "Back"
        ),
        goToStep3
      )
    );
  }

  step3() {
    return Screen(
      { title: "Welcome to scratch.git!", stepNumber: 3 },
      div(
        { class: "finishContent" },
        p("To be written", br(), br()),
        BottomBar(
          button({
            style: "align-items: right; margin-left: -10px",
            class: settings.settingsButton,
            onclick: () => this.close(),
          })
        )
      )
    );
  }
}
