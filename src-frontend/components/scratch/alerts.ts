import { misc, Copy, s, cls } from "..";
import type { DeviceCode } from "@/api";
import { Redux } from "@/lib";
import van, { ChildDom } from "vanjs-core";

const { div, img, span, a } = van.tags;

// https://github.com/scratchfoundation/scratch-gui/blob/develop/src/components/close-button/icon--close.svg
export const CLOSE_BUTTON_SVG =
  "data:image/svg+xml;base64,\
PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d\
3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdH\
lsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO\
3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVm\
cz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc\
0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT\
0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg==";

type AlertType = "success" | "warn" | "error";

/** Displays a custom scratch-gui alert */
export class ScratchAlert {
  private _type: AlertType = "success";
  private _buttons: ChildDom[] = [];
  private _timeout?: number;

  constructor(private message: string | ChildDom) {}

  timeout(ms: number) {
    this._timeout = ms;
    return this;
  }

  type(type: AlertType) {
    this._type = type;
    return this;
  }

  buttons(buttons: ChildDom[]) {
    this._buttons = buttons;
    return this;
  }

  /** Displays your alert and returns a reference to the alert to manipulate later */
  display() {
    const container = s("alerts_alerts-inner-container").select();

    const alertType = {
      success: "real-success-alert",
      warn: s("alert_warn"),
      error: s("alert_success"),
    }[this._type];

    const newAlert = div(
      {
        class: cls(s("alert_alert"), misc.box, alertType),
        style: "justify-content: space-between",
      },
      div({ class: s("alert_alert-message") }, this.message),
      div(
        { class: s("alert_alert-buttons") },
        div(
          {
            class: cls(
              s("alert_alert-close-button-container"),
              misc.box,
              this._buttons.length !== 0 ? "alert-with-buttons" : undefined
            ),
          },
          div(
            {
              ariaLabel: "Close",
              class: cls(
                s("close-button_close-button"),
                s("close-button_large")
              ),
              role: "button",
              tabIndex: "0",
              onclick: () => newAlert.remove(),
              ...(Redux.getState().scratchGui.theme.theme.gui === "dark" && {
                style: "background-color: rgba(0, 0, 0, 0.255)",
              }),
            },
            img({
              src: CLOSE_BUTTON_SVG,
              style: "transform: rotate(45deg) scale(0.5)",
            })
          ),
          ...this._buttons
        )
      )
    );
    if (this._timeout !== undefined) {
      setTimeout(() => newAlert.remove(), this._timeout);
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
    .type("success")
    .buttons([Copy(() => e.user_code)]);
