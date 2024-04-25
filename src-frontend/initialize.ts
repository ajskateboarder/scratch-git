/** @file Please someone refactor this nonsense */

import { Cmp, fileMenu, gitMenu, scratchAlert } from "./dom/index.ts";
import api from "./api.ts";
import { CommitModal, WelcomeModal, DiffModal } from "./modals/index.ts";

// @ts-ignore
import styles from "./styles.css";

import { showIndicators } from "./diff-indicators.ts";
import van from "vanjs-core";

const { link, style } = van.tags;

const Styles = () => {
  // TODO: unused styles?
  const menuContents = `
    div.${Cmp.MENU_ITEM}:has(#push-status):hover {
      cursor: pointer;
    }
    div.${Cmp.MENU_ITEM}:has(#allcommits-log):hover {
      cursor: pointer;
    }
    
    .${Cmp.SETTINGS_BUTTON}[disabled] {
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

export default async function () {
  if (!document.querySelector("dialog[is='diff-modal']")) {
    customElements.define("commit-modal", CommitModal, { extends: "dialog" });
    customElements.define("diff-modal", DiffModal, { extends: "dialog" });
    customElements.define("welcome-modal", WelcomeModal, { extends: "dialog" });

    const menu = `#app > div > div.${Cmp.MENU_POSITION}.${Cmp.MENU_BAR} > div.${Cmp.MENU_CONTAINER}`;

    const saveArea = document.querySelector<HTMLElement>(
      `${menu} > div:nth-child(4)`
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
      document.querySelector<HTMLDivElement>(`.${Cmp.SAVE_STATUS}`)!.onclick =
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
