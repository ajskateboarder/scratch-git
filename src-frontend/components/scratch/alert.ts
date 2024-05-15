import van from "vanjs-core";
import { misc, alert } from "..";

const { div, img } = van.tags;

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

/** Displays a custom scratch-gui alert
 *
 * @param message - the message to display
 * @param type - kind of alert to display
 * @param ms - the number of ms to show - no duration by default
 */
export function scratchAlert(
  message: string,
  type: "success" | "warn",
  ms?: number
) {
  const container = document.querySelector(`.${alert.container}`)!;

  const newAlert = div(
    {
      class: [alert.dialog, alert[type], misc.box].join(" "),
      style: "justify-content: space-between",
    },
    div({ class: alert.message }, message),
    div(
      { class: alert.buttons },
      div(
        { class: [alert.close, misc.box].join(" ") },
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
        )
      )
    )
  );

  if (ms !== undefined) {
    setTimeout(() => newAlert.remove(), ms);
  }

  container.appendChild(newAlert);
}
(window as any).scratchAlert = scratchAlert;
