import { Cmp, fileMenu } from "../dom/index.ts";
import api, { ProjectExistsException } from "../api.js";

//@ts-ignore
import thumbnail from "../media/thumb.svg";
import van, { type State } from "vanjs-core";
import { ComponentProps } from "../lib/van";

const BottomBar = ({ children, props }: ComponentProps<"div">) => {
  return (
    <div className="bottom-bar" {...{ props }}>
      {children}
    </div>
  );
};

const Screen = ({
  stepNumber,
  children,
  title,
}: ComponentProps<"div"> & {
  stepNumber: number;
  title: string;
}) => (
  <div className="screen" id={`step${stepNumber}`}>
    <div className="finishContent">
      <h1>{title}</h1>
      {children}
    </div>
  </div>
);

const Step1 = (that: WelcomeModal) => {
  const goToStep2 = (
    <button
      style="align-items: right; margin-left: -10px; "
      className={[Cmp.SETTINGS_BUTTON, Cmp.DISABLED_BUTTON].join(" ")}
      disabled
      onClick={() => ++that.currentStep.val}
    >
      Next
    </button>
  );

  const openProject = (
    <button
      style="width: 50%"
      className={Cmp.SETTINGS_BUTTON}
      onClick={() => {
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
      }}
    >
      Open project
    </button>
  );

  return (
    <Screen title="Welcome to scratch.git" stepNumber={1}>
      <p>
        Please load a project for Git development to get started.
        <br />
        <br />
      </p>
      <div className="a-gap">
        {openProject}
        <span>
          <input type="checkbox" name="dontshowagain" />
          <label htmlFor="dontshowagain"> Don't show again</label>
        </span>
      </div>
      <br />
      <br />
      <BottomBar>
        <button
          style="align-items: right; margin-left: -10px; "
          className={Cmp.SETTINGS_BUTTON}
          onClick={() => that.close()}
        >
          Close
        </button>
        {goToStep2}
      </BottomBar>
    </Screen>
  );
};

const Step2 = (that: WelcomeModal) => {
  let path: string;

  const creationError = (
    <pre id="creationError" style="color: red; font-size: 14px"></pre>
  );

  const goToStep3 = (
    <button
      style="align-items: right; margin-left: -10px; "
      className={[Cmp.SETTINGS_BUTTON, Cmp.DISABLED_BUTTON].join(" ")}
      disabled
      onClick={async () => {
        try {
          await api.createProject(path);
        } catch (e: unknown) {
          let err = e as ProjectExistsException;
          if (err.name === "ProjectExistsException") {
            creationError.innerHTML = err.message;
            return;
          } else if (err.name === "Error") {
            creationError.innerHTML = err.message;
            throw err;
          }
        }
        ++that.currentStep.val;
      }}
    >
      Next
    </button>
  ) as HTMLButtonElement;

  const openProjectPath = (
    <input
      type="file"
      className={Cmp.SETTINGS_BUTTON}
      accept=".sb,.sb2,.sb3"
      onChange={() => {
        goToStep3.disabled = false;
        goToStep3.classList.remove(Cmp.DISABLED_BUTTON);
        path = (openProjectPath.files![0] as any).path; // .path is an electron-specific attr
      }}
    />
  ) as HTMLInputElement;

  return (
    <Screen title="Configure project location" stepNumber={2}>
      <div style="font-weight: normal">
        <p>
          Please select the location of your project file. This is so
          scratch.git can find your project locally to use with your repository.
          <br />
          <br />
        </p>
        {openProjectPath}
        {creationError}
      </div>
      <BottomBar>
        <button
          style="align-items: right; margin-left: -10px; "
          className={Cmp.SETTINGS_BUTTON}
          onClick={() => --that.currentStep.val}
        >
          Back
        </button>
        {goToStep3}
      </BottomBar>
    </Screen>
  );
};

const Step3 = (that: WelcomeModal) => {
  return (
    <Screen title="Welcome to scratch.git!" stepNumber={3}>
      <div style="font-weight: normal">
        <p>
          To be written
          <br />
          <br />
        </p>
      </div>
      <BottomBar>
        <button
          style="align-items: right; margin-left: -10px; "
          className={Cmp.SETTINGS_BUTTON}
          onClick={() => that.close()}
        >
          Close
        </button>
      </BottomBar>
    </Screen>
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

    const thumb = (
      <span className="thumbnail">
        {
          new DOMParser().parseFromString(thumbnail, "image/svg+xml")
            .documentElement
        }
      </span>
    );

    if (!document.querySelector(".screen")) {
      van.add(this, this.steps[this.currentStep.val], thumb);
    }

    van.derive(() => {
      document.querySelector(".screen")?.remove();
      van.add(this, this.steps[this.currentStep.val], thumb);
      document.querySelector<HTMLDivElement>(".screen")!.style.display = "flex";
    });

    this.currentStep.val = 0;
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`)!.appendChild(fragment);
    document
      .querySelector<HTMLDialogElement>(
        `dialog[is="${this.getAttribute("is")}"]`
      )!
      .showModal();
  }

  async display() {
    if (!this.open) {
      this._showMe();
    }
  }
}
