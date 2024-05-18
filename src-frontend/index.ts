import "./lib/index";

import api, { GhAuth, Project } from "./api";
import { showIndicators } from "./diff-indicators";
import {
  menu,
  settings,
  fileMenu,
  gitMenu,
  misc,
  ScratchAlert,
  GhAuthAlert,
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
import { getLocale } from "./i18n";

const { link, style, button, i } = van.tags;

/** Packages our styles and external dependencies */
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

/** Handles pulling as a Git menu option
 *
 * @param project - the currently open project
 * @param authed - true if you are authenticated
 */
const pullHandler =
  async (project: Project, authed: boolean = false) =>
  async () => {
    if (
      !authed &&
      (await project!.getDetails()).repository.includes("github.com")
    ) {
      let auth = new GhAuth();
      let authAlert: HTMLDivElement | undefined = undefined;
      auth.addEventListener("devicecode", (e) => {
        authAlert = GhAuthAlert(e.detail).display();
      });
      auth.addEventListener("login", async () => {
        authAlert?.remove();
        await pullHandler(project!, true);
      });
    }

    let message = await project!.pull();
    if (message === "unrelated histories") {
      new ScratchAlert(
        "Couldn't pull new changes since they are unrelated with your changes"
      )
        .setType("error")
        .display();
    } else if (message === "success") {
      new ScratchAlert("Successfully pulled new changes. Reload to see them.")
        .setType("success")
        .addButtons([
          button(
            { class: "alert-button", onclick: () => location.reload() },
            i({ class: "fa-solid fa-rotate-right" })
          ),
        ])
        .display();
    } else if (message === "nothing new") {
      new ScratchAlert("There's no new changes to pull")
        .setType("success")
        .setTimeout(5000)
        .display();
    } else {
      new ScratchAlert(message).setType("error").display();
    }
  };

/** Handles pushing as a Git menu option
 *
 * @param project - the currently open project
 */
const pushHandler =
  async (project: Project, authed: boolean = false) =>
  async () => {
    if (
      !authed &&
      (await project!.getDetails()).repository.includes("github.com")
    ) {
      let auth = new GhAuth();
      let authAlert: HTMLDivElement | undefined = undefined;
      auth.addEventListener("devicecode", (e) => {
        authAlert = GhAuthAlert(e.detail).display();
      });
      auth.addEventListener("login", async () => {
        authAlert?.remove();
        await pushHandler(project!, true);
      });
    }

    let message = await project!.push();
    if (message === "pull needed") {
      new ScratchAlert(
        "The online repository contains work that you don't have. Try pulling changes from online first."
      )
        .setType("warn")
        .addButtons([
          button(
            {
              class: "alert-button",
              onclick: await pullHandler(project!),
            },
            "Pull"
          ),
        ])
        .display();
      return;
    }
    if (message === "up to date") {
      new ScratchAlert(
        "Everything is up to date. There are no new commits to push."
      )
        .setType("success")
        .setTimeout(5000)
        .display();
    } else {
      new ScratchAlert(
        `Pushed changes to ${
          (await project!.getDetails()).repository
        } successfully`
      )
        .setType("success")
        .setTimeout(5000)
        .display();
    }
  };

/** Builds the final Git Menu
 *
 * @param project - the currently open project
 * @param changeLocale - rebuild the entire menu only if the locale has changed
 */
const createGitMenu = async (project: Project, changeLocale?: string) =>
  gitMenu.create(
    {
      commitView: () =>
        document
          .querySelector<CommitModal>("dialog[is='commit-modal']")!
          .display(),
      commitCreate: async () => {
        let message = await project!.commit();
        new ScratchAlert(message).setType("success").setTimeout(5000).display();
      },
      push: await pushHandler(project!),
      pull: await pullHandler(project!),
      repoConfig: () => {
        document
          .querySelector<RepoConfigModal>("dialog[is='repo-config-modal']")!
          .display();
      },
    },
    changeLocale
  );

async function initialize() {
  document.querySelector("dialog[is='commit-modal']")?.remove();
  document.querySelector("dialog[is='diff-modal']")?.remove();
  document.querySelector("dialog[is='welcome-modal']")?.remove();
  document.querySelector("dialog[is='repo-config-modal']")?.remove();

  if (!document.querySelector("dialog[is='diff-modal']")) {
    try {
      customElements.define("commit-modal", CommitModal, { extends: "dialog" });
      customElements.define("diff-modal", DiffModal, { extends: "dialog" });
      customElements.define("welcome-modal", WelcomeModal, {
        extends: "dialog",
      });
      customElements.define("repo-config-modal", RepoConfigModal, {
        extends: "dialog",
      });
    } catch {}

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

  // ensure a click event listener for the save button
  new MutationObserver(() => {
    document
      .querySelector(`.${misc.saveArea}`)
      ?.firstChild!.addEventListener("click", displayDiffs);
  }).observe(document.querySelector(`.${misc.saveArea}`)?.firstChild!, {
    childList: true,
  });

  document.addEventListener("keydown", async (e) => {
    if (e.ctrlKey && e.key === "s") {
      await displayDiffs();
    }
  });

  let locale = getLocale();
  console.log(locale);

  document.head.append(...Styles());

  if (!fileMenu.isProjectOpen()) {
    document
      .querySelector<WelcomeModal>("dialog[is='welcome-modal']")!
      .display();
  } else {
    let project = await api.getCurrentProject();

    if (await project!.exists()) {
      // add initialization handlers to each language option
      // to make sure all our stuff gets updated to the new locale
      new MutationObserver(([mut, _]) => {
        const languageOptions = mut.target.firstChild?.firstChild?.lastChild
          ?.firstChild as HTMLUListElement | undefined;
        if (languageOptions) {
          [...languageOptions.children].forEach((e) => {
            e.addEventListener("click", () => {
              setTimeout(async () => {
                // project titles are removed after changing locale
                // by default so we set it back
                window.ReduxStore.dispatch({
                  type: "projectTitle/SET_PROJECT_TITLE",
                  title: project?.projectName,
                });
                await initialize();
                createGitMenu(project!, getLocale());
              }, 100);
            });
          });
        }
      }).observe(
        document.querySelector(`.${misc.menuItems}`)?.firstChild?.lastChild!,
        {
          childList: true,
        }
      );

      createGitMenu(project!);
    }
  }
}

(async () => {
  localStorage.setItem(
    "scratch-git:highlights",
    JSON.parse(localStorage.getItem("scratch-git:highlights") ?? "false")
  );
  localStorage.setItem(
    "scratch-git:plaintext",
    JSON.parse(localStorage.getItem("scratch-git:plaintext") ?? "false")
  );

  // avoids scenarios where scratch.git initializes before the editor is finished
  window.vm.runtime.on(
    "ASSET_PROGRESS",
    async (finished: number, total: number) => {
      if (finished === total && finished > 0 && total > 0) {
        setTimeout(async () => await initialize(), 0.1);
      }
    }
  );
})();
