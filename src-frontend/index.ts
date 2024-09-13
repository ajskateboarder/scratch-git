import api, { Project } from "./api";
import { createGitMenu, Styles } from "./init";
import { fileMenu, misc, ScratchAlert } from "./components";
import { showIndicators } from "./diff-indicators";
import { scratchblocks, vm } from "./lib";

import { initModals, WelcomeModal } from "./modals";
import { getReactHandlers } from "./utils";

const displayDiffs = async (project: Project) => {
  [
    ...document.querySelectorAll(`.diff-button`),
    ...document.querySelectorAll(`.stage-diff`),
  ].forEach((e) => e.remove());

  await project!.unzip();
  window._changedScripts = {};

  const indicators = await showIndicators(project!);
  if (!indicators) {
    new ScratchAlert("Nothing was changed. Did you open the right project?")
      .type("warn")
      .timeout(4000)
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
    return;
  }

  const project = api.getCurrentProject()!;

  if (!(await project.exists())) {
    return;
  }

  await createGitMenu(project!);
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
          (saveStatus as any)[getReactHandlers(saveStatus)].children[1].props
            .defaultMessage === "Saving project…"
        ) {
          saveButton.click();
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
};

window._changedScripts = {};

document.head.append(...Styles());

// avoids scenarios where scratch.git initializes before the editor is finished
// @ts-expect-error - scratch types don't include ASSET_PROGRESS
vm.runtime.on("ASSET_PROGRESS", async (finished: number, total: number) => {
  if (finished === total && finished > 0 && total > 0) {
    setTimeout(async () => await main());
  }
});

(window as any).api = api;
