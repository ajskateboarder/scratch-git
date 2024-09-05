import { WelcomeModal } from "./welcome";
import { DiffModal } from "./diff";
import { CommitModal } from "./commit";
import { RepoConfigModal } from "./repo-config";
import { SettingsModal } from "./settings";
import { s } from "../components";

export const initModals = () => {
  if (document.querySelector("commit-modal")) return;

  try {
    customElements.define("commit-modal", CommitModal);
    customElements.define("diff-modal", DiffModal);
    customElements.define("repo-config-modal", RepoConfigModal);
    customElements.define("settings-modal", SettingsModal);
    customElements.define("welcome-modal", WelcomeModal, {
      extends: "dialog",
    });
  } catch {}

  // insert the welcome modal into an area where it can show correctly (idk)
  const saveArea = document.querySelector<HTMLElement>(
    `#app > div > div.${s("gui_menu-bar-position")}.${s(
      "menu-bar_menu-bar"
    )} > div.${s("menu-bar_main-menu")} > div:nth-child(4)`
  )!;
  saveArea.style.opacity = "0";
  saveArea.innerHTML += `<dialog is="welcome-modal"></dialog>`

  document.body.appendChild(document.createElement("diff-modal"));
  document.body.appendChild(document.createElement("settings-modal"));
  document.body.appendChild(document.createElement("commit-modal"));
  document.body.appendChild(document.createElement("repo-config-modal"));
};

export { WelcomeModal, DiffModal, CommitModal, RepoConfigModal, SettingsModal };
