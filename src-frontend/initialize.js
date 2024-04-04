/** @file Please someone refactor this nonsense */

import { Cmp, fileMenu, gitMenu } from "./dom/index";
import { html } from "./utils";
import api from "./api";
import "./modals/index";

import BARS from "./media/bars.css";
import MISC from "./media/misc.css";
// import TOGGLE from "./media/switch.css";

import { showIndicators } from "./diff-indicators";

function injectStyles() {
  document.head.innerHTML += html`
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
      defer
    />
    <script
      type="text/javascript"
      src="https://cdn.jsdelivr.net/gh/vanjs-org/van/public/van-1.5.0.nomodule.min.js"
    ></script>
  `;
  const MENU_ITEM = `
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

  document.head.innerHTML += `<style>${MENU_ITEM}\n${BARS}\n${MISC}</style>`;
}

export default async function () {
  if (!document.querySelector("dialog[is='diff-modal']"))
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
        showIndicators(project);
      };
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "S") {
          let project = await api.getCurrentProject();
          await project.unzip();
          await showIndicators(project);
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
