/** @file Initializes the Git menu handlers and styles */
import { GhAuth, PullMsg, Project, PushMsg } from "./api";
import { GhAuthAlert, ScratchAlert, gitMenu, s, settings } from "./components";
import i18next from "../i18n";
import { CommitModal, RepoConfigModal } from "./modals";

import van from "vanjs-core";
import { repoIsGitHub } from "./utils";

// why can't rollup-plugin-import-css follow css imports?? why???
import styles from "./styles.css";
import diffStyles from "./modals/diff/styles.css";
import repoConfigStyles from "./modals/repo-config/styles.css";
import welcomeStyles from "./modals/welcome/styles.css";
import commitStyles from "./modals/commit/styles.css";

const { link, style, button, i } = van.tags;

/** Packages styles and external dependencies */
export const Styles = () => {
  console.debug("building styles");
  const disabledVersions = `
      .${settings.settingsButton}[disabled] {
        background-color: var(--menu-bar-background-default);
        color: rgba(255, 255, 255, 0.4);
        cursor: default;
      }

      .${s("menu_hoverable")}[disabled] {
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
  ).type("error"),
  success: new ScratchAlert(i18next.t("alerts.pull-success"))
    .type("success")
    .buttons([
      button(
        { class: "alert-button", onclick: () => location.reload() },
        i({ class: "fa-solid fa-rotate-right" })
      ),
    ]),
  "nothing new": new ScratchAlert(i18next.t("alerts.no-changes"))
    .type("success")
    .timeout(5000),
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
      } else {
        // TODO: localize
        // asking for username and password in the app would look suspicious
        upassAlert = new ScratchAlert(
          "Please enter your username and password in the terminal to pull new changes."
        )
          .type("success")
          .display();
      }
    }

    const message = await project!.pull();
    upassAlert?.remove();
    (
      PULL_MESSAGES[message] ?? new ScratchAlert(message).type("error")
    ).display();
  };

const PUSH_MESSAGES: Record<
  PushMsg,
  (project: Project) => Promise<ScratchAlert>
> = {
  "pull needed": async (project) =>
    new ScratchAlert(i18next.t("alerts.inconsistent-work"))
      .type("warn")
      .buttons([
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
      .type("success")
      .timeout(5000),
  "up to date": async (_) =>
    new ScratchAlert(i18next.t("alerts.up-to-date"))
      .type("success")
      .timeout(5000),
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
      } else {
        // TODO: localize
        upassAlert = new ScratchAlert(
          "Please enter your username and password in the terminal to push your changes."
        )
          .type("success")
          .display();
      }
    }

    const message = await project.push();
    upassAlert?.remove();
    (await PUSH_MESSAGES[message](project)).display();
  };

const COMMIT_MESSAGES: Record<number, ScratchAlert> = {
  [-1]: new ScratchAlert(i18next.t("alerts.commit.nothing-to-add"))
    .type("warn")
    .timeout(5000),
  [-2]: new ScratchAlert(i18next.t("alerts.commit.identity-needed")).type(
    "error"
  ),
  [-3]: new ScratchAlert(i18next.t("alerts.commit.nothing-to-commit"))
    .type("warn")
    .timeout(5000),
  [-4]: new ScratchAlert(i18next.t("alerts.commit.fail")).type("error"),
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
  console.debug("building git menu");
  gitMenu.create(
    {
      commitView: () =>
        document
          .querySelector<CommitModal>("dialog[is='commit-modal']")!
          .display(),
      commitCreate: async () => {
        const message = await project!.commit();
        document
          .querySelectorAll(".stage-diff,.diff-button")
          .forEach((e) => e.remove());
        document.querySelector("filter#blocklyStackDiffFilter")?.remove();
        project!.repoStatus().then((e) => (window._repoStatus = e));
        (
          COMMIT_MESSAGES[message as number] ??
          new ScratchAlert(message).type("success").timeout(5000)
        ).display();
      },
      push: await pushHandler(project!),
      pull: await pullHandler(project!),
      repoConfig: () => {
        document
          .querySelector<RepoConfigModal>("dialog[is='repo-config-modal']")!
          .display();
      },
      settings: () => {
        document
          .querySelector<RepoConfigModal>("dialog[is='settings-modal']")!
          .display();
      },
    },
    changeLocale
  );
  gitMenu.setPushPullStatus((await project!.getDetails()).repository !== "");
};
