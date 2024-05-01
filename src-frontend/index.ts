import "./lib/index";

import api from "./api.ts";
import { showIndicators } from "./diff-indicators.ts";
import {
  menu,
  settings,
  fileMenu,
  gitMenu,
  scratchAlert,
  misc,
} from "./dom/index.ts";
import { CommitModal, WelcomeModal, DiffModal } from "./modals/index.ts";

// @ts-ignore
import styles from "./styles.css";
import van from "vanjs-core";

const { link, style } = van.tags;

declare global {
  interface Window {
    ReduxStore: {
      getState: () => {
        scratchGui: {
          theme: {
            theme: {
              blocks: "three" | "dark" | "high-contrast";
              gui: "light" | "dark";
            };
          };
        };
      };
    };
    vm: any;
    Blockly: any;
    _lib: {
      scratchblocks: {
        appendStyles: () => void;
        renderMatching: (loc: string, config: {}) => void;
      };
      parseSB3Blocks: {
        toScratchblocks: (
          script: string,
          json: {},
          language: string,
          config: {}
        ) => string;
      };
    };
    _changedScripts: string[];
  }
}

const Styles = () => {
  // TODO: unused styles?
  const menuContents = `
    div.${menu.menuItem}:has(#push-status):hover {
      cursor: pointer;
    }
    div.${menu.menuItem}:has(#allcommits-log):hover {
      cursor: pointer;
    }
    
    .${settings.settingsButton}[disabled] {
      background-color: var(--menu-bar-background-default);
      color: rgba(255, 255, 255, 0.4);
      cursor: default;
    }`;

  return [
    link({
      rel: "stylesheet",
      href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
      defer: true,
    }),
    style(`
    ${menuContents}
    ${styles}
    `),
  ];
};

async function initialize() {
  if (!document.querySelector("dialog[is='diff-modal']")) {
    customElements.define("commit-modal", CommitModal, { extends: "dialog" });
    customElements.define("diff-modal", DiffModal, { extends: "dialog" });
    customElements.define("welcome-modal", WelcomeModal, { extends: "dialog" });

    const saveArea = document.querySelector<HTMLElement>(
      `#app > div > div.${menu.menuPos}.${menu.menuBar} > div.${menu.container} > div:nth-child(4)`
    )!;
    saveArea.style.opacity = "0";
    saveArea.innerHTML += `<dialog is="diff-modal"></dialog>
          <dialog
            is="commit-modal"
            style="overflow-x: hidden; overflow-y: auto"
          ></dialog>
          <dialog
            is="welcome-modal"
            style="overflow-x: hidden; overflow-y: hidden"
          ></dialog>`;
  }

  const displayDiffs = async () => {
    [
      ...document.querySelectorAll(`.diff-button`),
      ...document.querySelectorAll(`.stage-diff`),
    ].forEach((e) => e.remove());
    let project = await api.getCurrentProject()!;
    await project!.unzip();
    await showIndicators(project!);
  };

  // setting an interval ensures the listeners always exist
  setInterval(() => {
    try {
      document.querySelector<HTMLDivElement>(`.${misc.saveStatus}`)!.onclick =
        displayDiffs;
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.key === "s") {
          await displayDiffs();
        }
      };
    } catch {}
  }, 500);

  document.head.append(...Styles());

  if (!fileMenu.isProjectOpen()) {
    document
      .querySelector<WelcomeModal>("dialog[is='welcome-modal']")!
      .display();
  } else {
    let project = await api.getCurrentProject();
    if (await project!.exists()) {
      let wip = () => alert("Work in progress!");
      gitMenu.create({
        commitView: async () =>
          document
            .querySelector<CommitModal>("dialog[is='commit-modal']")!
            .display(),
        commitCreate: async () => {
          let message = await project!.commit();
          scratchAlert({ message, duration: 5000 });
        },
        push: wip,
        repoConfig: wip,
      });
    }
  }
}

(async () => {
  // avoids scenarios where scratch.git initializes before the editor is finished
  localStorage.setItem(
    "scratch-git:highlights",
    JSON.parse(localStorage.getItem("scratch-git:highlights") ?? "false")
  );
  localStorage.setItem(
    "scratch-git:plaintext",
    JSON.parse(localStorage.getItem("scratch-git:plaintext") ?? "false")
  );

  window.vm.runtime.on(
    "ASSET_PROGRESS",
    async (finished: number, total: number) => {
      if (finished === total && finished > 0 && total > 0) {
        setTimeout(async () => await initialize(), 0.1);
      }
    }
  );
})();
