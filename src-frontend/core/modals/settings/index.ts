import { defaults, userSettings } from "@/core/settings";
import { Modal } from "../base";
import van from "vanjs-core";
import { cls, s, settings } from "@/core/components";
import { uninstall } from "@/core/api";
import i18n from "@/i18n";

const { div, label, input, span, h1, p, summary, details, img, button, i, a } =
  van.tags;

// https://github.com/TurboWarp/scratch-gui/blob/develop/src/components/tw-settings-modal/help-icon.svg
const HELP_ICON_SVG = `data:image/svg+xml;base64,\
PCEtLSBodHRwczovL21hdGVyaWFsLmlvL3Jlc291cmNlcy9pY29ucy8/c2Vhc\
mNoPWhlbHAmaWNvbj1oZWxwJnN0eWxlPWJhc2VsaW5lIC0tPgo8c3ZnIHhtbG5\
zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgaGVpZ2h0PSIyNCIgdmlld\
0JveD0iMCAwIDI0IDI0IiB3aWR0aD0iMjQiPjxwYXRoIGQ9Ik0wIDBoMjR2MjR\
IMHoiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTIgMkM2LjQ4IDIgMiA2LjQ4ID\
IgMTJzNC40OCAxMCAxMCAxMCAxMC00LjQ4IDEwLTEwUzE3LjUyIDIgMTIgMnptM\
SAxN2gtMnYtMmgydjJ6bTIuMDctNy43NWwtLjkuOTJDMTMuNDUgMTIuOSAxMyAx\
My41IDEzIDE1aC0ydi0uNWMwLTEuMS40NS0yLjEgMS4xNy0yLjgzbDEuMjQtMS4y\
NmMuMzctLjM2LjU5LS44Ni41OS0xLjQxIDAtMS4xLS45LTItMi0ycy0yIC45LTIg\
Mkg4YzAtMi4yMSAxLjc5LTQgNC00czQgMS43OSA0IDRjMCAuODgtLjM2IDEuNjgt\
LjkzIDIuMjV6Ii8+PC9zdmc+`;

const HelpIcon = () =>
  img({
    class: s("settings-modal_help-icon"),
    src: HELP_ICON_SVG,
    style: "margin-left: 0.5rem; pointer-events: auto",
    title: "Click for help",
  });

const ScriptColor = () => {
  const colorInput = div(
    { class: settings.settingsLabel },
    label(
      { class: settings.settingsLabel, style: "margin-left: 0.5rem" },
      "  ",
      input({
        class: settings.settingsCheckbox,
        style: "pointer-events: auto",
        type: "color",
        onchange: (e) => (userSettings.scriptColor = e.target.value),
      }),
      span(" ", i18n.t("settings.highlight.name"))
    ),
    HelpIcon()
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(colorInput),
    i18n.t("settings.highlight.help")
  );
};

const Highlights = () => {
  const hlInput = div(
    {
      class: settings.settingsLabel,
    },
    label(
      {
        class: settings.settingsLabel,
        style: "margin-left: 0.5rem",
      },
      "  ",
      input({
        class: cls(settings.settingsCheckbox, settings.checkbox),
        style: "pointer-events: auto",
        type: "checkbox",
        onchange: (e: Event) =>
          (userSettings.highlights = (e.target! as HTMLInputElement).checked),
      }),
      span(" ", i18n.t("settings.highlight-diffs.name"))
    ),
    HelpIcon()
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(hlInput),
    i18n.t("settings.highlight-diffs.help")
  );
};

const PlainText = () => {
  const ptInput = div(
    {
      class: settings.settingsLabel,
    },
    label(
      {
        class: settings.settingsLabel,
        style: "margin-left: 0.5rem",
      },
      "  ",
      input({
        class: cls(settings.settingsCheckbox, settings.checkbox),
        style: "pointer-events: auto",
        type: "checkbox",
        onchange: (e: Event) =>
          (userSettings.plainText = (e.target! as HTMLInputElement).checked),
      }),
      span(" ", i18n.t("settings.plain-text.name"))
    ),
    HelpIcon()
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(ptInput),
    i18n.t("settings.plain-text.help")
  );
};

export class SettingsModal extends Modal {
  connectedCallback() {
    const [scriptColor, highlights, plainText] = [
      ScriptColor(),
      Highlights(),
      PlainText(),
    ];
    const [scInput, hlInput, ptInput] = [
      scriptColor,
      highlights,
      plainText,
    ].map((e) => e.querySelector("input")!);

    const closeButton = button(
      {
        class: settings.settingsButton,
        onclick: () => {
          this.close();
          scriptColor.open = false;
          highlights.open = false;
          plainText.open = false;
        },
      },
      i({ class: "fa-solid fa-xmark" })
    );

    const restoreDefaults = button(
      {
        class: settings.settingsButton,
        onclick: () => {
          userSettings.defaults();
          scInput.value = defaults.scriptColor;
          hlInput.checked = defaults.highlights;
          ptInput.checked = defaults.plainText;
        },
      },
      i18n.t("settings.reset-to-defaults")
    );

    const uninstallButton = button(
      {
        class: settings.settingsButton,
        onclick: async () => {
          if (confirm(i18n.t("settings.uninstall-note"))) {
            await uninstall();
            userSettings.clear();
            (window._changedScripts as any) = undefined;
            (window._repoStatus as any) = undefined;
            window.location.reload();
          }
        },
      },
      i18n.t("settings.uninstall")
    );

    scInput.value = userSettings.scriptColor;
    hlInput.checked = userSettings.highlights;
    ptInput.checked = userSettings.plainText;

    van.add(
      this,
      div(
        { class: "settings-wrapper" },
        h1({ class: "header" }, "Settings", closeButton),
        p(
          { style: "color: var(--ui-modal-foreground)" },
          scriptColor,
          highlights,
          plainText
        ),
        div(
          {
            class: "bottom-bar",
            style: "margin-top: 10px",
          },
          restoreDefaults,
          uninstallButton
        ),
        p(
          {
            style:
              "color: var(--ui-modal-foreground); position: absolute; bottom: 10px",
          },
          a(
            { href: "https://github.com/ajskateboarder/scratch-git" },
            i({ class: "fa-brands fa-github" })
          ),
          " ",
          a(
            { href: "https://ajskateboarder.github.io/scratch-git/privacy" },
            i({ class: "fa-solid fa-shield-halved" })
          )
        )
      )
    );
  }

  public display() {
    this.showModal();
  }

  public refresh() {
    this.querySelector(".settings-wrapper")!.remove();
    this.connectedCallback();
  }
}
