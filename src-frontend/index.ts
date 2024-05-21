import "./lib/index";

import api from "./api";
import { showIndicators } from "./diff-indicators";
import { menu, fileMenu, misc } from "./components";
import {
  CommitModal,
  WelcomeModal,
  DiffModal,
  RepoConfigModal,
} from "./modals";

import i18next, { getLocale } from "./i18n";
import { Redux, VM } from "./lib";

import { Styles, createGitMenu } from "./bootstrap";
import { Modal } from "./modals/base";

async function initialize() {
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
    (misc.saveArea.select()?.firstChild! as HTMLDivElement).onclick =
      displayDiffs;
  }).observe(misc.saveArea.select()?.firstChild!, {
    childList: true,
  });

  document.addEventListener("keydown", async (e) => {
    if (e.ctrlKey && e.key === "s") {
      await displayDiffs();
    }
  });

  if (!fileMenu.isProjectOpen()) {
    document.querySelector<Modal>("dialog[is='welcome-modal']")!.display();
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
            (e as HTMLDivElement).onclick = () => {
              setTimeout(async () => {
                // project titles are removed after changing locale
                // by default so we set it back
                Redux.dispatch({
                  type: "projectTitle/SET_PROJECT_TITLE",
                  title: project?.projectName,
                });

                await initialize();
                createGitMenu(project!, getLocale());
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
}

(() => {
  localStorage.setItem(
    "scratch-git:highlights",
    JSON.parse(localStorage.getItem("scratch-git:highlights") ?? "false")
  );
  localStorage.setItem(
    "scratch-git:plaintext",
    JSON.parse(localStorage.getItem("scratch-git:plaintext") ?? "false")
  );

  document.head.append(...Styles());

  // avoids scenarios where scratch.git initializes before the editor is finished
  VM.on("ASSET_PROGRESS", async (finished: number, total: number) => {
    if (finished === total && finished > 0 && total > 0) {
      setTimeout(async () => await initialize(), 0.1);
    }
  });
})();
