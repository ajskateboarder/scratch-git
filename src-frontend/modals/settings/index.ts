import { DEFAULTS, userSettings } from "@/settings";
import { Modal } from "../base";
import van from "vanjs-core";
import { cls, s, settings } from "@/core";
import { uninstall } from "@/api";
import i18n from "@/l10n";
import { Redux } from "@/lib";

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

const HelpIcon = (dark: boolean) =>
  img({
    class: s("settings-modal_help-icon"),
    src: HELP_ICON_SVG,
    style: `margin-left: 0.5rem; pointer-events: auto${
      dark ? "; filter: invert(1)" : ""
    }`,
    title: "Click for help",
  });

const ScriptColor = (dark: boolean) => {
  const colorInput = div(
    { class: settings.settingsLabel },
    label(
      { class: settings.settingsLabel, style: "margin-left: 0.5rem" },
      "  ",
      input({
        class: settings.settingsCheckbox,
        style: "pointer-events: auto",
        type: "color",
        value: userSettings.scriptColor,
        onchange: (e) => (userSettings.scriptColor = e.target.value),
      }),
      span(" ", i18n.t("settings.highlight.name"))
    ),
    HelpIcon(dark)
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

const ImgChangeColors = (dark: boolean) => {
  const colorInput = div(
    { class: settings.settingsLabel },
    label(
      { class: settings.settingsLabel, style: "margin-left: 0.5rem" },
      "  ",
      input({
        class: settings.settingsCheckbox,
        style: "pointer-events: auto",
        type: "color",
        value: userSettings.imgAddColor,
        onchange: (e) => (userSettings.imgAddColor = e.target.value),
      }),
      "  ",
      input({
        class: settings.settingsCheckbox,
        style: "pointer-events: auto",
        type: "color",
        value: userSettings.imgRmColor,
        onchange: (e) => (userSettings.imgRmColor = e.target.value),
      }),
      span(" ", i18n.t("settings.img-change-colors.name"))
    ),
    HelpIcon(dark)
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(colorInput),
    i18n.t("settings.img-change-colors.help")
  );
};

const Highlights = (dark: boolean) => {
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
    HelpIcon(dark)
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

const PlainText = (dark: boolean) => {
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
    HelpIcon(dark)
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

const Settings = (dark: boolean) => [
  ScriptColor(dark),
  ImgChangeColors(dark),
  Highlights(dark),
  PlainText(dark),
];

export class SettingsModal extends Modal {
  connectedCallback() {
    const dark = Redux.getState().scratchGui.theme.theme.gui === "dark";

    const [scriptColor, imgChangeColors, highlights, plainText] =
      Settings(dark);

    const [scInput, icInput, hlInput, ptInput] = [
      scriptColor,
      imgChangeColors,
      highlights,
      plainText,
    ].map((e) => e.querySelectorAll("input")!);

    const closeButton = button(
      {
        class: settings.button,
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
        class: settings.button,
        onclick: () => {
          userSettings.defaults();
          scInput[0].value = DEFAULTS.scriptColor;
          icInput[0].value = DEFAULTS.imgAddColor;
          icInput[1].value = DEFAULTS.imgRmColor;
          hlInput[0].checked = DEFAULTS.highlights;
          ptInput[0].checked = DEFAULTS.plainText;
        },
      },
      i18n.t("settings.reset-to-defaults")
    );

    const uninstallButton = button(
      {
        class: settings.button,
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

    scInput[0].value = userSettings.scriptColor;
    hlInput[0].checked = userSettings.highlights;
    ptInput[0].checked = userSettings.plainText;
    icInput[0].value = userSettings.imgAddColor;
    icInput[1].value = userSettings.imgRmColor;

    van.add(
      this,
      div(
        { class: "settings-wrapper" },
        h1({ class: "header" }, "Settings", closeButton),
        p(
          { style: "color: var(--ui-modal-foreground)" },
          scriptColor,
          imgChangeColors,
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
    // TODO: probably a better alt to doing a modal refresh every time
    this.querySelector(".settings-wrapper")!.remove();
    this.connectedCallback();
    this.showModal();
  }

  public refresh() {
    this.querySelector(".settings-wrapper")!.remove();
    this.connectedCallback();
  }
}
