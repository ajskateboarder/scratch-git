import "./lib/index";

import api from "./api";
import { showIndicators } from "./diff-indicators";
import {
  menu,
  settings,
  fileMenu,
  gitMenu,
  scratchAlert,
  misc,
} from "./components";
import {
  CommitModal,
  WelcomeModal,
  DiffModal,
  RepoConfigModal,
} from "./modals";

// @ts-ignore
import styles from "./styles.css";
// @ts-ignore
import tippy from "./tippy.css";

import van from "vanjs-core";
import { getLocale } from "./l10n";

const { link, style, button, span } = van.tags;

const Styles = () => {
  const menuContents = `
    .${settings.settingsButton}[disabled] {
      background-color: var(--menu-bar-background-default);
      color: rgba(255, 255, 255, 0.4);
      cursor: default;
    }`;

  // https://github.com/TurboWarp/scratch-gui/commit/c77d0c53d89f7fde2dd9be962399764ffbded111
  const alertSuccess = `
    .real-success-alert {
      background: hsla(163, 57%, 85%, 1) !important;
      border: 1px solid hsla(163, 85%, 30%, 1) !important;
      box-shadow: 0px 0px 0px 2px hsla(163, 57%, 85%, 1) !important;
    }
  `;

  return [
    link({
      rel: "stylesheet",
      href: "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
      defer: true,
    }),
    style(
      { id: "scratch-git-styles" },
      `
    ${menuContents}
    ${alertSuccess}
    ${styles}
    ${tippy}
    `
    ),
  ];
};

async function initialize() {
  if (!document.querySelector("dialog[is='diff-modal']")) {
    customElements.define("commit-modal", CommitModal, { extends: "dialog" });
    customElements.define("diff-modal", DiffModal, { extends: "dialog" });
    customElements.define("welcome-modal", WelcomeModal, { extends: "dialog" });
    customElements.define("repo-config-modal", RepoConfigModal, {
      extends: "dialog",
    });

    const saveArea = document.querySelector<HTMLElement>(
      `#app > div > div.${menu.menuPos}.${menu.menuBar} > div.${menu.container} > div:nth-child(4)`
    )!;
    saveArea.style.opacity = "0";

    // appending van elems will not work
    saveArea.innerHTML += `<dialog is="diff-modal"></dialog>
          <dialog
            is="commit-modal"
          ></dialog>
          <dialog
            is="welcome-modal"
          ></dialog>
          <dialog
          is="repo-config-modal"
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
      document.addEventListener("keydown", async (e) => {
        if (e.ctrlKey && e.key === "s") {
          await displayDiffs();
        }
      });
    } catch {}
  }, 500);

  let locale = getLocale();

  document.head.append(...Styles());

  if (!fileMenu.isProjectOpen()) {
    document
      .querySelector<WelcomeModal>("dialog[is='welcome-modal']")!
      .display(locale);
  } else {
    let project = await api.getCurrentProject();
    if (await project!.exists()) {
      gitMenu.create({
        commitView: () =>
          document
            .querySelector<CommitModal>("dialog[is='commit-modal']")!
            .display(),
        commitCreate: async () => {
          let message = await project!.commit();
          scratchAlert(message, "success", 5000);
        },
        push: async () => {
          let message = await project!.push();
          if (message === "pull needed") {
            let pullAlert = scratchAlert(
              span(
                { style: "display: flex" },
                "The online repository contains work that you don't have. Try pulling changes from online first.",
                button(
                  {
                    onclick: async () => {
                      let message = await project!.pull();
                      pullAlert.remove();
                      if (message === "unrelated histories") {
                        scratchAlert(
                          "Couldn't pull new changes since they are unrelated with your changes",
                          "error"
                        );
                      } else if (message === "success") {
                        scratchAlert(
                          "Successfully pulled new changes!",
                          "success",
                          5000
                        );
                      } else {
                        scratchAlert(message, "error");
                      }
                    },
                  },
                  "Pull"
                )
              ),
              "warn"
            );
            return;
          }
          if (message === "up to date") {
            scratchAlert(
              "Everything is up to date. There are no new commits to push.",
              "success",
              5000
            );
          } else {
            scratchAlert(
              `Pushed changes to ${
                (await project!.getDetails()).repository
              } successfully`,
              "success",
              5000
            );
          }
        },
        pull: async () => {
          let message = await project!.pull();
          if (message === "unrelated histories") {
            scratchAlert(
              "Couldn't pull new changes since they are unrelated with your changes",
              "error"
            );
          } else if (message === "success") {
            scratchAlert("Successfully pulled new changes", "success", 5000);
          } else if (message === "nothing new") {
            scratchAlert("There's no new changes to pull", "success", 5000);
          } else {
            scratchAlert(message, "error");
          }
        },
        repoConfig: () => {
          document
            .querySelector<RepoConfigModal>("dialog[is='repo-config-modal']")!
            .display();
        },
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
