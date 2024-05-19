import van, { ChildDom } from "vanjs-core";
import { misc, alert, Copy } from "..";
import type { DeviceCode } from "@/api";

const { div, img, span, a } = van.tags;

// taken directly from Scratch
const CLOSE_BUTTON_SVG =
  "data:image/svg+xml;base64,\
PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d\
3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdH\
lsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO\
3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVm\
cz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc\
0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT\
0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg==";

/** Displays a custom scratch-gui alert */
export class ScratchAlert {
  private message: string | ChildDom;
  private type: "success" | "warn" | "error" = "success";
  private buttons: ChildDom[] = [];
  private timeout?: number;

  constructor(message: string | ChildDom) {
    this.message = message;
  }

  setTimeout(ms: number) {
    this.timeout = ms;
    return this;
  }

  setType(type: "success" | "warn" | "error") {
    this.type = type;
    return this;
  }

  addButtons(buttons: ChildDom[]) {
    this.buttons = buttons;
    return this;
  }

  display() {
    const container = alert.container.select();

    const alertType = {
      success: "real-success-alert",
      warn: alert.warn,
      error: alert.success,
    }[this.type];

    const newAlert = div(
      {
        class: [alert.dialog, misc.box, alertType].join(" "),
        style: "justify-content: space-between",
      },
      div({ class: alert.message }, this.message),
      div(
        { class: alert.buttons },
        div(
          {
            class: [alert.close, misc.box].join(" "),
            ...(this.buttons.length !== 0 && {
              style: "display: flex; width: 100%; gap: 10px",
            }),
          },
          div(
            {
              ariaLabel: "Close",
              class: [misc.close, misc.largeClose].join(" "),
              role: "button",
              tabIndex: "0",
              onclick: () => newAlert.remove(),
              ...(window.ReduxStore.getState().scratchGui.theme.theme.gui ===
                "dark" && {
                style: "background-color: rgba(0, 0, 0, 0.255)",
              }),
            },
            img({
              src: CLOSE_BUTTON_SVG,
              style: "transform: rotate(45deg) scale(0.5)",
            })
          ),
          ...this.buttons
        )
      )
    );
    if (this.timeout !== undefined) {
      setTimeout(() => newAlert.remove(), this.timeout);
    }
    container.appendChild(newAlert);
    return newAlert;
  }
}

export const GhAuthAlert = (e: DeviceCode) =>
  new ScratchAlert(
    span(
      "Authentication needed for GitHub. Please go to ",
      a({ href: e.verification_uri }, "github.com/login/device"),
      ` and enter the code: ${e.user_code}`
    )
  )
    .setType("warn")
    .addButtons([Copy(() => e.user_code)]);
