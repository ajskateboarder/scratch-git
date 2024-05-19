import api, { ProjectExistsException } from "@/api";
import { settings, fileMenu } from "@/components";
<<<<<<< HEAD
import thumbnail from "./thumbnail.svg.ts";
import van, { type State } from "vanjs-core";
import i18next from "@/i18n";
=======
// @ts-ignore
import thumbnail from "./thumbnail.svg";
import van, { type State } from "vanjs-core";
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb

const {
  tags: { div, h1, button, p, br, span, input, pre, i },
} = van;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

<<<<<<< HEAD
const Screen = (step: { number: number; title: string }, ...children: any) =>
  div(
    { class: "screen", id: `step${step.number}` },
    div({ class: "welcome-screen-content" }, h1(step.title), children)
=======
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
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
      i18next.t("welcome.next")
=======
      "Next"
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
            openProject.innerHTML = `<i class="fa-solid fa-check"></i> ${i18next.t(
              "welcome.project-opened"
            )}`;
            setTimeout(() => {
              openProject.innerHTML = i18next.t("welcome.open-project");
=======
            openProject.innerHTML = `<i class="fa-solid fa-check"></i> Project opened`;
            setTimeout(() => {
              openProject.innerHTML = "Open project";
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
            }, 2000);
          });
        },
      },
<<<<<<< HEAD
      i18next.t("welcome.open-project")
    );

    return Screen(
      { title: i18next.t("welcome.welcome"), number: 1 },
      div(
        { style: "font-weight: normal" },
        p(i18next.t("welcome.get-started"), br(), br()),
=======
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
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
          i18next.t("close")
=======
          "Close"
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
      i18next.t("next")
=======
      "Next"
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
      { title: i18next.t("welcome.configure-project-loc"), number: 2 },
      div(
        { class: "welcome-screen-content" },
        p(i18next.t("welcome.select-location"), br(), br()),
=======
      { title: "Configure project location", stepNumber: 2 },
      div(
        { class: "finishContent" },
        p(
          "Please select the location of your project file. This is so scratch.git can find your project locally to use with your repository.",
          br(),
          br()
        ),
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
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
<<<<<<< HEAD
          i18next.t("welcome.back")
=======
          "Back"
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
        ),
        goToStep3
      )
    );
  }

  step3() {
    return Screen(
<<<<<<< HEAD
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
=======
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
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
        )
      )
    );
  }
}
