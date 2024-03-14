/** @file Please someone refactor this nonsense */

import { Cmp, fileMenu, gitMenu } from "./dom/index";
import { html } from "./utils";
import api from "./api";
import "./modals/index";

import barStyles from "./media/bars.css";
import miscStyles from "./media/misc.css";

function injectStyles() {
  document.head.innerHTML += html`
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      defer
    />
  `;
  const MENU_ITEM_CSS = `
    div.${Cmp.MENU_ITEM}:has(#push-status):hover {
      cursor: pointer;
    }
    div.${Cmp.MENU_ITEM}:has(#allcommits-log):hover {
      cursor: pointer;
    }
    
    .${Cmp.SETTINGS_BUTTON}[disabled] {
      background-color: hsla(0, 60%, 55%, 1);
      color: rgba(255, 255, 255, 0.4);
      cursor: default;
    }`;

  document.head.innerHTML += `<style>${MENU_ITEM_CSS}\n${barStyles}\n${miscStyles}</style>`;
}

export default async function () {
  document.querySelector(
    "body > div[style='display: none;']"
  ).innerHTML += html`<dialog
      is="diff-modal"
      style="overflow-x: hidden"
    ></dialog>
    <dialog
      is="commit-modal"
      style="overflow-x: hidden; overflow-y: auto"
    ></dialog>
    <dialog
      is="welcome-modal"
      style="overflow-x: hidden; overflow-y: hidden"
    ></dialog>`;

  // setting an interval ensures the listeners always exist
  setInterval(() => {
    try {
      document.querySelector(`.${Cmp.SAVE_STATUS}`).onclick = async () => {
        let project = await api.getCurrentProject();
        await project.unzip();
        let sprites = await project.getSprites();
        document.querySelector("dialog[is='diff-modal']").diff(sprites[0]);
      };
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "S") {
          let project = await api.getCurrentProject();
          await project.unzip();
          let sprites = await project.getSprites();
          document.querySelector("dialog[is='diff-modal']").diff(sprites[0]);
        }
      };
    } catch {}
  }, 500);

  injectStyles();

  document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[1].onclick = () => {
    const isDark = document.body.getAttribute("theme") === "dark";
    document.querySelectorAll(".git-button").forEach((element) => {
      element.parentElement.style.backgroundColor = isDark
        ? "#333"
        : "hsla(0, 100%, 65%, 1)";
    });
  };
  if (!fileMenu.isProjectOpen()) {
    document.querySelector("dialog[is='welcome-modal']").display();
  } else {
    let project = await api.getCurrentProject();
    if (await project.exists()) {
      gitMenu.create({
        commitViewHandler: async () =>
          document.querySelector("dialog[is='commit-modal']").display(),
      });
    }
  }
}
