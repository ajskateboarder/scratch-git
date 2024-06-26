/** @file Initializes the Git menu handlers and styles */
import { GhAuth, PullMsg, Project, PushMsg } from "./api";
import {
  GhAuthAlert,
  ScratchAlert,
  gitMenu,
  menu,
  settings,
} from "./components";
import i18next from "./i18n";
import { CommitModal, RepoConfigModal } from "./modals";
import "./styles.css";
import van from "vanjs-core";
import { repoIsGitHub } from "./utils";

// why can't rollup-plugin-import-css follow css imports?? why???
import styles from "./styles.css";
import diffStyles from "./modals/diff/styles.css";
import repoConfigStyles from "./modals/repo-config/styles.css";
import welcomeStyles from "./modals/welcome/styles.css";
import commitStyles from "./modals/commit/styles.css";

const { link, style, button, i } = van.tags;

/** Packages our styles and external dependencies */
export const Styles = () => {
  const disabledVersions = `
      .${settings.settingsButton}[disabled] {
        background-color: var(--menu-bar-background-default);
        color: rgba(255, 255, 255, 0.4);
        cursor: default;
      }

      .${menu.menuHoverable}[disabled] {
        pointer-events: none;
        opacity: 0.5;
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
      ${disabledVersions}
      ${alertSuccess}
      ${styles}
      ${diffStyles}
      ${repoConfigStyles}
      ${welcomeStyles}
      ${commitStyles}
      `
    ),
  ];
};

const PULL_MESSAGES: Record<PullMsg, ScratchAlert> = {
  "unrelated histories": new ScratchAlert(
    i18next.t("alerts.unrelated-changes")
  ).setType("error"),
  success: new ScratchAlert(i18next.t("alerts.pull-success"))
    .setType("success")
    .addButtons([
      button(
        { class: "alert-button", onclick: () => location.reload() },
        i({ class: "fa-solid fa-rotate-right" })
      ),
    ]),
  "nothing new": new ScratchAlert(i18next.t("alerts.no-changes"))
    .setType("success")
    .setTimeout(5000),
};

/** Handles pulling as a Git menu option
 *
 * @param project - the currently open project
 * @param authed - true if you are authenticated
 */
const pullHandler =
  async (project: Project, authed = false) =>
  async () => {
    let upassAlert;

    if (!authed) {
      if (await repoIsGitHub(project)) {
        const auth = new GhAuth();
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

      // TODO: localize
      // asking for username and password in the app would look suspicious
      upassAlert = new ScratchAlert(
        "Please enter your username and password in the terminal to pull new changes."
      )
        .setType("success")
        .display();
    }

    const message = await project!.pull();
    upassAlert?.remove();
    (
      PULL_MESSAGES[message] ?? new ScratchAlert(message).setType("error")
    ).display();
  };

const PUSH_MESSAGES: Record<
  PushMsg,
  (project: Project) => Promise<ScratchAlert>
> = {
  "pull needed": async (project) =>
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
      ]),
  success: async (project) =>
    new ScratchAlert(
      i18next.t("alerts.push-success", {
        url: (await project!.getDetails()).repository,
      })
    )
      .setType("success")
      .setTimeout(5000),
  "up to date": async (_) =>
    new ScratchAlert(i18next.t("alerts.up-to-date"))
      .setType("success")
      .setTimeout(5000),
};

/** Handles pushing as a Git menu option
 *
 * @param project - the currently open project
 */
const pushHandler =
  async (project: Project, authed: boolean = false) =>
  async () => {
    let upassAlert;

    if (!authed) {
      if (await repoIsGitHub(project)) {
        const auth = new GhAuth();
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

      // TODO: localize
      upassAlert = new ScratchAlert(
        "Please enter your username and password in the terminal to push your changes."
      )
        .setType("success")
        .display();
    }

    const message = await project.push();
    upassAlert?.remove();
    (await PUSH_MESSAGES[message](project)).display();
  };

/** Builds the final Git Menu
 *
 * @param project - the currently open project, which should exist
 * @param changeLocale - rebuild the entire menu only if the locale has changed
 */
export const createGitMenu = async (
  project: Project,
  changeLocale?: string
) => {
  gitMenu.create(
    {
      commitView: () =>
        document
          .querySelector<CommitModal>("dialog[is='commit-modal']")!
          .display(),
      commitCreate: async () => {
        const message = await project!.commit();
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
  gitMenu.setPushPullStatus((await project!.getDetails()).repository !== "");
};
