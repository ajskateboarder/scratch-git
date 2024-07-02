import api, { Project } from "./core/api";
import { Styles, createGitMenu } from "./core/init";
import { fileMenu, misc, ScratchAlert, s } from "./core/components";
import { showIndicators } from "./core/diff-indicators";
import i18next, { getLocale } from "./i18n";
import { Redux, VM } from "./lib";

import {
  CommitModal,
  WelcomeModal,
  DiffModal,
  RepoConfigModal,
  SettingsModal,
} from "./core/modals";
import { Modal } from "./core/modals/base";
import { getReactHandlers } from "./core/utils";
import { userSettings } from "./core/settings";

const main = async () => {
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
      customElements.define("settings-modal", SettingsModal, {
        extends: "dialog",
      });
    } catch {}

    const saveArea = document.querySelector<HTMLElement>(
      `#app > div > div.${s("gui_menu-bar-position")}.${s(
        "menu-bar_menu-bar"
      )} > div.${s("menu-bar_main-menu")} > div:nth-child(4)`
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
          ></dialog>
          <dialog
          is="settings-modal"
          ></dialog>`;
  }

  const displayDiffs = async (project: Project) => {
    [
      ...document.querySelectorAll(`.diff-button`),
      ...document.querySelectorAll(`.stage-diff`),
    ].forEach((e) => e.remove());
    await project!.unzip();
    window._changedScripts = {};
    try {
      await showIndicators(project!);
    } catch (e) {
      new ScratchAlert(i18next.t("alerts.wrong-project"))
        .type("warn")
        .timeout(5000)
        .display();
    }
  };

  if (!fileMenu.projectOpen()) {
    await document
      .querySelector<WelcomeModal>("dialog[is='welcome-modal']")!
      .display();
  } else {
    const project = api.getCurrentProject();

    if (await project!.exists()) {
      // ensure a click event listener for the save button
      new MutationObserver(() => {
        const saveButton = misc.saveArea.select<HTMLDivElement>();
        saveButton.onclick = () => {
          const observer = new MutationObserver(async () => {
            const saveStatus = saveButton.firstElementChild;
            if (saveStatus === null) {
              observer.disconnect();
              return;
            }
            // i think this is language-insensitive.. i tested
            if (
              (saveStatus as any)[getReactHandlers(saveStatus)].children[1]
                .props.defaultMessage === "Saving project…"
            ) {
              await displayDiffs(project!);
              return;
            }
          });

          observer.observe(saveButton, {
            childList: true,
          });
        };
      }).observe(misc.saveArea.select(), {
        childList: true,
      });

      // this hopefully doesn't conflict with addons
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.key === "s") {
          await displayDiffs(project!);
        }
      };

      // add initialization handlers to each language option
      // to make sure all our stuff gets updated to the new locale
      // can there please be a Redux thing i can listen for
      new MutationObserver(([mut, _]) => {
        const languageOptions = mut.target.firstChild?.firstChild?.lastChild
          ?.firstChild as HTMLUListElement | undefined;
        if (languageOptions) {
          [...languageOptions.children].forEach((e) => {
            (e as HTMLDivElement).onclick = () => {
              setTimeout(async () => {
                // project titles are removed after changing lang by default
                Redux.dispatch({
                  type: "projectTitle/SET_PROJECT_TITLE",
                  title: project?.projectName,
                });

                await main();
                await createGitMenu(project!, getLocale());
                i18next.changeLanguage(getLocale());

                document
                  .querySelector<Modal>("dialog[is=repo-config-modal]")!
                  .refresh();
                document
                  .querySelector<Modal>("dialog[is=welcome-modal]")!
                  .refresh();
                document
                  .querySelector<Modal>("dialog[is=diff-modal]")!
                  .refresh();
                document
                  .querySelector<Modal>("dialog[is=commit-modal]")!
                  .refresh();
                document
                  .querySelector<Modal>("dialog[is=settings-modal]")!
                  .refresh();
              }, 100);
            };
          });
        }
      }).observe(misc.menuItems.select().firstChild?.lastChild!, {
        childList: true,
      });

      createGitMenu(project!);
    }
  }
};

window._changedScripts = {};
userSettings.init();

document.head.append(...Styles());

// avoids scenarios where scratch.git initializes before the editor is finished
VM.on("ASSET_PROGRESS", async (finished: number, total: number) => {
  if (finished === total && finished > 0 && total > 0) {
    setTimeout(async () => await main(), 0.1);
  }
});
