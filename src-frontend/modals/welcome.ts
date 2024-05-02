import api, { ProjectExistsException } from "@/api";
import { settings, fileMenu } from "@/components";
// @ts-ignore
import thumbnail from "./thumbnail.svg";
import van from "vanjs-core";
import { wc } from "./wc";

const {
  tags: { div, h1, button, p, br, span, input, pre, i },
} = van;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (stepNumber: number, title: string, ...children: any) =>
  div(
    { class: "screen", id: `step${stepNumber}` },
    div({ class: "finishContent" }, h1(title), children)
  );

interface IWelcomeDialog {
  step1: () => any;
  step2: () => any;
  step3: () => any;
  display: () => any;
  steps: Element[];
  loadedProject: boolean;
  currentStep: number;
}

/** Project initialization */
export const WelcomeModal = wc<IWelcomeDialog, HTMLDialogElement>(
  HTMLDialogElement,
  `dialog[is="welcome-modal"]`,
  {
    currentStep: -1,
    steps: [],
    loadedProject: false,

    connectedCallback({ self, root }) {
      if (root.querySelector("div") || root.querySelector("style")) return;
      self.steps = [self.step1(), self.step2(), self.step3()];

      const thumb = span(
        { class: "thumbnail" },
        new DOMParser().parseFromString(thumbnail, "image/svg+xml")
          .documentElement
      );

      self.subscribe("currentStep", () => {
        root.querySelector(".screen")?.remove();
        root.appendChild(self.steps[self.currentStep]);
        root.appendChild(thumb);
        root.querySelector<HTMLDivElement>(".screen")!.style.display = "flex";
      });
    },

    async display({ self }) {
      if (!self.open) {
        self.steps = [self.step1(), self.step2(), self.step3()];
        self.currentStep = 0;
        self.showModal();
      }
    },

    step1({ self }) {
      const goToStep2 = button(
        {
          style: "align-items: right; margin-left: -10px",
          class: [settings.settingsButton, settings.disabledButton].join(" "),
          disabled: true,
          onclick: () => ++self.currentStep,
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
              self.loadedProject = true;
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
        1,
        "Welcome to scratch.git",
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
              onclick: () => self.close(),
            },
            "Close"
          ),
          goToStep2
        )
      );
    },

    step2({ self }) {
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
            ++self.currentStep;
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
        2,
        "Configure project location",
        div(
          { class: "finishContent" },
          p(
            "Please select the location of your project file. self is so scratch.git can find your project locally to use with your repository.",
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
              onclick: () => --self.currentStep,
            },
            "Back"
          ),
          goToStep3
        )
      );
    },

    step3({ self }) {
      return Screen(
        3,
        "Welcome to scratch.git!",
        div(
          { class: "finishContent" },
          p("To be written", br(), br()),
          BottomBar(
            button({
              style: "align-items: right; margin-left: -10px",
              class: settings.settingsButton,
              onclick: () => self.close(),
            })
          )
        )
      );
    },
  }
);
