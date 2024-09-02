import van from "vanjs-core";
import { clearSettings, DEFAULTS, setDefaults, userSettings } from "@/settings";
import { cls, s, settings } from "@/components";
import { uninstall } from "@/api";
import { Redux } from "@/lib";
import { Modal } from "../modal";

const { div, label, input, span, p, summary, details, img, button } = van.tags;

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
      span(" ", "Highlight")
    ),
    HelpIcon(dark)
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(colorInput),
    "Changes the highlight color of changed scripts"
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
      span(" ", "Image addition/removal colors")
    ),
    HelpIcon(dark)
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(colorInput),
    "Changes the colors for parts of an image that were added or removed"
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
      span(" ", "Show diffs with highlights")
    ),
    HelpIcon(dark)
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(hlInput),
    "If this is enabled, diffs will be highlighted instead of being outlined or crossed out."
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
      span(" ", "Show diffs in plain text")
    ),
    HelpIcon(dark)
  );

  return details(
    {
      class: s("settings-modal_setting"),
      style: "pointer-events: none",
    },
    summary(ptInput),
    "If this is enabled, diffs will be shown in plain text instead of Scratch blocks."
  );
};

const Settings = (dark: boolean) => [
  ScriptColor(dark),
  ImgChangeColors(dark),
  Highlights(dark),
  PlainText(dark),
];

export class SettingsModal extends HTMLElement {
  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();

    const dark =
      (Redux.getState().scratchGui as any).theme.theme.gui === "dark";

    const [scriptColor, imgChangeColors, highlights, plainText] =
      Settings(dark);

    const [scInput, icInput, hlInput, ptInput] = [
      scriptColor,
      imgChangeColors,
      highlights,
      plainText,
    ].map((e) => e.querySelectorAll("input")!);

    const restoreDefaults = button(
      {
        class: settings.button,
        onclick: () => {
          setDefaults();
          scInput[0].value = DEFAULTS.scriptColor;
          icInput[0].value = DEFAULTS.imgAddColor;
          icInput[1].value = DEFAULTS.imgRmColor;
          hlInput[0].checked = DEFAULTS.highlights;
          ptInput[0].checked = DEFAULTS.plainText;
        },
      },
      "Reset to defaults"
    );

    const uninstallButton = button(
      {
        class: settings.button,
        onclick: async () => {
          if (confirm("Are you sure you want to uninstall scratch.git?")) {
            if (await uninstall()) {
              clearSettings();
              (window._changedScripts as any) = undefined;
              (window._repoStatus as any) = undefined;
              window.location.reload();
            } else {
              // TODO: o_0 what
              alert("Failed to uninstall");
            }
          }
        },
      },
      "Uninstall"
    );

    van.add(
      this,
      Modal(
        div(
          { class: "settings-wrapper" },
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
          )
        ),
        "Git Settings",
        () => this.close()
      )
    );

    scInput[0].value = userSettings.scriptColor;
    icInput[0].value = userSettings.imgAddColor;
    icInput[1].value = userSettings.imgRmColor;
    hlInput[0].checked = userSettings.highlights;
    ptInput[0].checked = userSettings.plainText;
  }

  public display() {
    // TODO: probably a better alt to doing a modal refresh every time
    this.querySelector(".ReactModalPortal")!.remove();
    this.connectedCallback();
    this.showModal();
  }

  showModal() {
    this.style.display = "block";
  }
  close() {
    this.style.display = "none";
  }
  get open() {
    return this.style.display !== "none";
  }
}
