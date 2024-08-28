import { WelcomeModal } from "./welcome";
import { DiffModal } from "./diff";
import { CommitModal } from "./commit";
import { RepoConfigModal } from "./repo-config";
import { SettingsModal } from "./settings";
import { s } from "../components";
import type { Modal } from "./base";

const MODALS = ["welcome"];

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

  // insert modals into area where they can show correctly
  const saveArea = document.querySelector<HTMLElement>(
    `#app > div > div.${s("gui_menu-bar-position")}.${s(
      "menu-bar_menu-bar"
    )} > div.${s("menu-bar_main-menu")} > div:nth-child(4)`
  )!;
  saveArea.style.opacity = "0";
  saveArea.innerHTML += MODALS.map(
    (e) => `<dialog is="${e}-modal"></dialog>`
  ).join("");
  document.body.appendChild(document.createElement("diff-modal"));
  document.body.appendChild(document.createElement("settings-modal"));
  document.body.appendChild(document.createElement("commit-modal"));
  document.body.appendChild(document.createElement("repo-config-modal"));
};

export const refreshModals = () => {
  MODALS.forEach((e) =>
    document.querySelector<Modal>(`[is=${e}-modal]`)!.refresh()
  );
  document.querySelector<Modal>(`diff-modal`)!.refresh();
  document.querySelector<Modal>(`settings-modal`)!.refresh();
  document.querySelector<Modal>(`commit-modal`)!.refresh();
  document.querySelector<Modal>(`repo-config-modal`)!.refresh();
};

export { WelcomeModal, DiffModal, CommitModal, RepoConfigModal, SettingsModal };
