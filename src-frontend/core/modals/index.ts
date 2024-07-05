import { WelcomeModal } from "./welcome";
import { DiffModal } from "./diff";
import { CommitModal } from "./commit";
import { RepoConfigModal } from "./repo-config";
import { SettingsModal } from "./settings";
import { s } from "../components";
import type { Modal } from "./base";

const MODALS = ["diff", "commit", "welcome", "repo-config", "settings"];

export const initModals = () => {
  if (customElements.get("commit-modal")) return;

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
};

export const refreshModals = () => {
  MODALS.forEach((e) =>
    document.querySelector<Modal>(`[is=${e}-modal]`)!.refresh()
  );
};

export { WelcomeModal, DiffModal, CommitModal, RepoConfigModal, SettingsModal };