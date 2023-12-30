import { html } from "./utils";
import Cmp from "./accessors";

class FileMenu {
  constructor() {
    this.menu = document.querySelectorAll(`div.${Cmp.MENU_ITEM}`)[2];
    this.reactEventHandlers = Object.keys(this.menu).filter((e) =>
      e.startsWith("__reactEventHandlers")
    )[0];
  }

  openProject() {
    this.menu[this.reactEventHandlers].onMouseUp();
    let loadFromComputer = this.menu.querySelectorAll("li")[2];
    loadFromComputer[this.reactEventHandlers].onClick();
    this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
  }

  isProjectOpen() {
    this.menu[this.reactEventHandlers].onMouseUp();
    let savedMenu = new DOMParser().parseFromString(
      this.menu.innerHTML,
      "text/html"
    );
    this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
}

export class Alert {
  /** @param {{message: string; duration: number}} */
  constructor({ message, duration }) {
    this.message = message;
    this.duration = duration;
  }

  display() {
    const CLOSE_BUTTON_SVG =
      "data:image/svg+xml;base64, \
        PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d \
        3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdH \
        lsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO \
        3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVm \
        cz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc \
        0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT \
        0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg==";

    document.querySelector(`.${Cmp.ALERT_CONTAINER}`).innerHTML = html`<div
      class="${Cmp.ALERT_DIALOG} ${Cmp.ALERT_SUCCESS} ${Cmp.BOX}"
      style="justify-content: space-between"
    >
      <div class="${Cmp.ALERT_MESSAGE}">${this.message}</div>
      <div class="${Cmp.ALERT_BUTTONS}">
        <div class="${Cmp.ALERT_CLOSE_CONTAINER} ${Cmp.BOX}">
          <div
            aria-label="Close"
            class="${Cmp.CLOSE_BUTTON} ${Cmp.ALERT_CLOSE_BUTTON} ${Cmp.CLOSE_BUTTON_LARGE}"
            role="button"
            tabindex="0"
          >
            <img
              class="${Cmp.CLOSE_ICON} undefined"
              style="filter: invert(70%)"
              src="${CLOSE_BUTTON_SVG}"
            />
          </div>
        </div>
      </div>
    </div>`;
    if (document.querySelector("body").getAttribute("theme") === "dark") {
      document.querySelector(`.${Cmp.CLOSE_BUTTON}`).style.backgroundColor =
        "rgba(0, 0, 0, 0.255)";
    }
    document.querySelector(`.${Cmp.CLOSE_BUTTON}`).onclick = this.remove;
    setTimeout(this.remove, this.duration);
  }

  remove() {
    document.querySelector(`.${Cmp.ALERT_CONTAINER}`).innerHTML = "";
  }
}

export const fileMenu = new FileMenu();
