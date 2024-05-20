/** @file Initializes the Git menu handlers and styles */

import van from "vanjs-core";
import { GhAuthAlert, ScratchAlert, gitMenu, settings } from "./components";

import styles from "./styles.css";
import tippy from "./tippy.css";
import { GhAuth, type Project } from "./api";
import i18next from "./i18n";
import { CommitModal, RepoConfigModal } from "./modals";

const { link, style, button, i } = van.tags;

/** Packages our styles and external dependencies */
export const Styles = () => {
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

/** Check if a project's configured remote URL is a GitHub URL
 *
 * @param project - the project to be checked
 */
const repoIsGitHub = async (project: Project) =>
  new URL((await project!.getDetails()).repository).host === "github.com";

/** Handles pulling as a Git menu option
 *
 * @param project - the currently open project
 * @param authed - true if you are authenticated
 */
const pullHandler =
  async (project: Project, authed: boolean = false) =>
  async () => {
    if (!authed && (await repoIsGitHub(project))) {
      let auth = new GhAuth();
      let authAlert: HTMLDivElement | undefined = undefined;
      auth.addEventListener("devicecode", ({ detail }: any) => {
        authAlert = GhAuthAlert(detail).display();
      });
      auth.addEventListener("login", async () => {
        authAlert?.remove();
        auth.close();
        await pullHandler(project!, true);
      });
    }

    let message = await project!.pull();
    if (message === "unrelated histories") {
      new ScratchAlert(i18next.t("alerts.unrelated-changes"))
        .setType("error")
        .display();
    } else if (message === "success") {
      new ScratchAlert(i18next.t("alerts.pull-success"))
        .setType("success")
        .addButtons([
          button(
            { class: "alert-button", onclick: () => location.reload() },
            i({ class: "fa-solid fa-rotate-right" })
          ),
        ])
        .display();
    } else if (message === "nothing new") {
      new ScratchAlert(i18next.t("no-changes"))
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
    if (!authed && (await repoIsGitHub(project))) {
      let auth = new GhAuth();
      let authAlert: HTMLDivElement | undefined = undefined;
      auth.addEventListener("devicecode", ({ detail }: any) => {
        authAlert = GhAuthAlert(detail).display();
      });
      auth.addEventListener("login", async () => {
        authAlert?.remove();
        auth.close();
        await pushHandler(project!, true);
      });
    }

    let message = await project!.push();
    if (message === "pull needed") {
      new ScratchAlert(i18next.t("alerts.inconsistent-work"))
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
      new ScratchAlert(i18next.t("alerts.up-to-date"))
        .setType("success")
        .setTimeout(5000)
        .display();
    } else {
      new ScratchAlert(
        i18next.t("alerts.pull-success", {
          url: (await project!.getDetails()).repository,
        })
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
export const createGitMenu = async (project: Project, changeLocale?: string) =>
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
