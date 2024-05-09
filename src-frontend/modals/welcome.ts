import api, { ProjectExistsException } from "@/api";
import { settings, fileMenu } from "@/components";
// @ts-ignore
import thumbnail from "./thumbnail.svg";
import van, { type State } from "vanjs-core";
import { Locale, getLocale } from "@/l10n";

const {
  tags: { div, h1, button, p, br, span, input, pre, i },
} = van;

const BottomBar = (...children: any) => div({ class: "bottom-bar" }, children);

const Screen = (step: { number: number; title: string }, ...children: any) =>
  div(
    { class: "screen", id: `step${step.number}` },
    div({ class: "finishContent" }, h1(step.title), children)
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
    const locale = getLocale();
    this.steps = [this.step1(locale), this.step2(locale), this.step3(locale)];

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

  async display(locale: Locale) {
    if (!this.open) {
      this.steps = [this.step1(locale), this.step2(locale), this.step3(locale)];
      this.currentStep.val = 0;
      this.showModal();
    }
  }

  step1({ translations: { welcome, close } }: Locale) {
    const goToStep2 = button(
      {
        style: "align-items: right; margin-left: -10px",
        class: [settings.settingsButton, settings.disabledButton].join(" "),
        disabled: true,
        onclick: () => ++this.currentStep.val,
      },
      welcome.next
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
            openProject.innerHTML = `<i class="fa-solid fa-check"></i> ${welcome.projectOpened}`;
            setTimeout(() => {
              openProject.innerHTML = welcome.openProject;
            }, 2000);
          });
        },
      },
      welcome.openProject
    );

    return Screen(
      { title: welcome.welcomeHeader, number: 1 },
      div(
        { style: "font-weight: normal" },
        p(welcome.getStarted, br(), br()),
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
          close
        ),
        goToStep2
      )
    );
  }

  step2({ translations: { welcome } }: Locale) {
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
      welcome.next
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
      { title: welcome.configureHeader, number: 2 },
      div(
        { class: "finishContent" },
        p(welcome.selectLocation, br(), br()),
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
          welcome.back
        ),
        goToStep3
      )
    );
  }

  step3({ translations: { welcome, close } }: Locale) {
    return Screen(
      { title: welcome.welcomeHeader, number: 3 },
      div(
        { class: "finishContent" },
        p("To be written", br(), br()),
        BottomBar(
          button(
            {
              style: "align-items: right; margin-left: -10px",
              class: settings.settingsButton,
              onclick: () => this.close(),
            },
            close
          )
        )
      )
    );
  }
}
