import api, { Project } from "./api";
import { Styles, createGitMenu } from "./init";
import { fileMenu, misc, ScratchAlert } from "./core";
import { showIndicators } from "./diff-indicators";
import i18next, { getLocale } from "./l10n";
import { Redux, scratchblocks, VM } from "./lib";

import { initModals, refreshModals, WelcomeModal } from "./modals";
import { getReactHandlers } from "./utils";
import { userSettings } from "./settings";

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

const main = async () => {
  scratchblocks.appendStyles();
  initModals();

  if (!fileMenu.projectOpen()) {
    await document
      .querySelector<WelcomeModal>("dialog[is='welcome-modal']")!
      .display();
  } else {
    const project = api.getCurrentProject();

    if (await project!.exists()) {
      window._repoStatus = await project!.repoStatus();
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
            if (
              (saveStatus as any)[getReactHandlers(saveStatus)].children[1]
                .props.defaultMessage === "Saving project…"
            ) {
              await displayDiffs(project!);
              window._repoStatus = await project!.repoStatus();
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
                refreshModals();
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
    setTimeout(async () => await main());
  }
});
