import { Cmp, fileMenu } from "../dom/index.ts";
import api, { ProjectExistsException } from "../api.js";

// @ts-ignore
import thumbnail from "./thumbnail.svg";
import van, { type State } from "vanjs-core";
import { ComponentProps } from "../lib/van";

const {
  tags: { div, h1, button, p, br, span, input, label, pre, i },
} = van;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (
  {
    stepNumber,
    title,
  }: ComponentProps<"div"> & {
    stepNumber: number;
    title: string;
  },
  ...children: any
) =>
  div(
    { class: "screen", id: `step${stepNumber}` },
    div({ class: "finishContent" }, h1(title), children)
  );

const Step1 = (that: WelcomeModal) => {
  const goToStep2 = button(
    {
      style: "align-items: right; margin-left: -10px",
      class: [Cmp.SETTINGS_BUTTON, Cmp.DISABLED_BUTTON].join(" "),
      disabled: true,
      onclick: () => ++that.currentStep.val,
    },
    "Next"
  );

  const openProject = button(
    {
      style: "width: 50%",
      class: Cmp.SETTINGS_BUTTON,
      onclick: () => {
        fileMenu.openProject();
        window.vm.runtime.on("PROJECT_LOADED", () => {
          that.loadedProject = true;
          (goToStep2 as HTMLButtonElement).disabled = false;
          goToStep2.classList.remove(Cmp.DISABLED_BUTTON);
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
      p("Please load a project for Git development to get started", br(), br()),
      div(
        { class: "a-gap" },
        openProject,
        span(
          input({ type: "checkbox", name: "dontshowagain" }),
          label({ for: "dontshowagain" }, "Don't show again")
        )
      ),
      br(),
      br()
    ),
    BottomBar(
      button(
        {
          style: "align-items: right: margin-left: -10px",
          class: Cmp.SETTINGS_BUTTON,
          onclick: () => that.close(),
        },
        "Close"
      ),
      goToStep2
    )
  );
};

const Step2 = (that: WelcomeModal) => {
  let path: string;

  const creationError = pre({ id: "creationError" });

  const goToStep3 = button(
    {
      style: "align-items: right; margin-left: -10px",
      class: [Cmp.SETTINGS_BUTTON, Cmp.DISABLED_BUTTON].join(" "),
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
        ++that.currentStep.val;
      },
    },
    "Next"
  );

  const openProjectPath = input({
    type: "file",
    class: Cmp.SETTINGS_BUTTON,
    accept: ".sb,.sb2,.sb3",
    onchange: () => {
      goToStep3.disabled = false;
      goToStep3.classList.remove(Cmp.DISABLED_BUTTON);
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
          class: Cmp.SETTINGS_BUTTON,
          onclick: () => --that.currentStep.val,
        },
        "Back"
      ),
      goToStep3
    )
  );
};

const Step3 = (that: WelcomeModal) => {
  return Screen(
    { title: "Welcome to scratch.git!", stepNumber: 3 },
    div(
      { class: "finishContent" },
      p("To be written", br(), br()),
      BottomBar(
        button({
          style: "align-items: right; margin-left: -10px",
          class: Cmp.SETTINGS_BUTTON,
          onclick: () => that.close(),
        })
      )
    )
  );
};

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
    this.steps = [Step1(this), Step2(this), Step3(this)];

    const thumb = span(
      { class: "thumbnail" },
      new DOMParser().parseFromString(thumbnail, "image/svg+xml")
        .documentElement
    );

    if (!document.querySelector(".screen")) {
      van.add(this, this.steps[this.currentStep.val], thumb);
    }

    van.derive(() => {
      document.querySelector(".screen")?.remove();
      van.add(this, this.steps[this.currentStep.val], thumb);
      document.querySelector<HTMLDivElement>(".screen")!.style.display = "flex";
    });
  }

  async display() {
    if (!this.open) {
      this.steps = [Step1(this), Step2(this), Step3(this)];
      this.currentStep.val = 0;
      this.showModal();
    }
  }
}
