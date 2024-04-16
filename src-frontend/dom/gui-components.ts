import van from "../lib/van.js";
import { Cmp } from "./accessors.ts";

const { div, img } = van.tags;

type GitMenuFunctions = {
  push: () => any;
  repoLocation: () => any;
  ghToken: () => any;
  commitView: () => any;
  commitCreate: () => any;
};

class FileMenu {
  menu: HTMLDivElement;
  eventHandlers: string;

  constructor() {
    this.menu = document.querySelectorAll<HTMLDivElement>(
      `div.${Cmp.MENU_ITEM}`
    )[1];
    this.eventHandlers = Object.keys(this.menu).filter((e) =>
      e.startsWith("__reactEventHandlers")
    )[0];
  }

  clickMenu(open: boolean) {
    // we pass a fake event object to control whether to open or close the file menu
    // https://github.com/TurboWarp/scratch-gui/blob/0ea490d0c1a744770fcca86fcb99eb23774d0219/src/components/menu-bar/tw-menu-label.jsx#L33-L44
    (this.menu as any)[this.eventHandlers].onClick({
      target: {
        closest: () => (open ? this.menu : document.body),
      },
    });
  }

  /** Opens a file picker dialog to load projects into TurboWarp */
  openProject() {
    this.clickMenu(true);
    const loadFromComputer: any = this.menu.querySelectorAll("li")[2];
    loadFromComputer[this.eventHandlers].onClick();
    this.clickMenu(false);
    this.clickMenu(true);
  }

  /** Returns if a project is currently open */
  isProjectOpen() {
    this.clickMenu(true);
    const savedMenu = new DOMParser().parseFromString(
      this.menu.innerHTML,
      "text/html"
    );
    this.clickMenu(false);
    this.clickMenu(true);
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
}

/** Manages functions with the file menu */
export const fileMenu = new FileMenu();

class GitMenu {
  savedItems: HTMLElement | undefined;
  newMenu: HTMLElement | undefined;
  open: boolean;
  initialized: boolean;

  constructor() {
    this.open = false;
    this.initialized = false;
  }

  item(index: number = 1) {
    const li = this.savedItems!.querySelectorAll("li")[index - 1];
    return {
      label: (text: string) => {
        try {
          li.querySelector("span")!.innerText = text;
        } catch (e) {
          li.innerText = text;
        }
      },
      remove: () => li.remove(),
      onclick: (handler: () => any) => {
        li.addEventListener("click", async (e) => {
          e.stopPropagation();
          this.newMenu!.classList.remove(Cmp.MENU_ITEM_ACTIVE);
          this.savedItems!.style.display = "none";
          this.open = false;
          await handler();
        });
      },
      elem: li,
    };
  }

  /**
   * Copy the File nav menu and edit it to become a Git one
   */
  create({
    push,
    repoLocation,
    ghToken,
    commitView,
    commitCreate,
  }: GitMenuFunctions) {
    if (this.initialized) return;

    // open, copy, and edit the file menu
    fileMenu.clickMenu(false);
    fileMenu.clickMenu(true);
    this.newMenu = fileMenu.menu.cloneNode(true) as HTMLDivElement;
    fileMenu.menu.after(this.newMenu);
    this.newMenu.classList.remove(Cmp.MENU_ITEM_ACTIVE);
    this.newMenu.querySelector("span")!.innerText = "Git";
    this.savedItems = this.newMenu
      .querySelector("ul")!
      .parentElement!.cloneNode(true) as HTMLElement;
    this.newMenu.querySelector("img")!.replaceWith(
      Object.assign(document.createElement("i"), {
        className: "fa fa-code-fork fa-lg",
      })
    );
    this.savedItems.classList.add("git-menu");
    this.newMenu.querySelector("ul")!.parentElement!.remove();
    this.savedItems.style.display = "none";
    this.newMenu.appendChild(this.savedItems);

    this.item(1).label("Push project");
    this.item(1).onclick(push);
    this.item(2).label("Configure repository");
    this.item(2).onclick(repoLocation);
    this.item(3).elem.classList.remove(Cmp.MENU_SECTION);
    this.item(3).label("Configure GitHub token");
    this.item(3).onclick(ghToken);
    this.item(4).remove();
    this.item(4).remove();
    this.item(4).label("View commits");
    this.item(4).onclick(commitView);
    this.item(5).elem.classList.remove(Cmp.MENU_SECTION);
    this.item(5).label("Commit");
    this.item(5).onclick(commitCreate);

    // make new menu toggle-able
    this.newMenu.onclick = () => {
      if (this.savedItems!.style.display === "none") {
        this.newMenu!.classList.add(Cmp.MENU_ITEM_ACTIVE);
        this.savedItems!.style.display = "block";
        this.open = true;
      } else {
        this.newMenu!.classList.remove(Cmp.MENU_ITEM_ACTIVE);
        this.savedItems!.style.display = "none";
        this.open = false;
      }
    };

    // close new menu upon clicking anywhere outside of the menu
    document.querySelector<HTMLDivElement>("#app")!.onmouseup = (e) => {
      if (
        e.target !== this.newMenu &&
        //@ts-ignore
        e.target!.parentNode !== this.newMenu &&
        this.open
      ) {
        this.newMenu!.classList.remove(Cmp.MENU_ITEM_ACTIVE);
        this.savedItems!.style.display = "none";
        this.open = false;
      }
    };

    fileMenu.clickMenu(true);
    this.initialized = true;
  }
}

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
export function scratchAlert({
  message,
  duration,
}: {
  message: string;
  duration: number;
}) {
  const container = document.querySelector(`.${Cmp.ALERT_CONTAINER}`)!;

  const remove = () => (container.innerHTML = "");
  setTimeout(remove, duration);

  container.appendChild(
    div(
      {
        className: [Cmp.ALERT_DIALOG, Cmp.ALERT_SUCCESS, Cmp.BOX].join(" "),
        style: "justify-content: space-between",
      },
      div({ className: Cmp.ALERT_MESSAGE }, message),
      div(
        { className: Cmp.ALERT_BUTTONS },
        div(
          { className: [Cmp.ALERT_CLOSE_CONTAINER, Cmp.BOX].join(" ") },
          div(
            {
              ariaLabel: "Close",
              className: [Cmp.CLOSE_BUTTON, Cmp.CLOSE_BUTTON_LARGE].join(" "),
              role: "button",
              tabIndex: "0",
              onclick: () => remove(),
              ...(window.ReduxStore.getState().scratchGui.theme.theme.gui ===
                "dark" && {
                style: "background-color: rgba(0, 0, 0, 0.255)",
              }),
            },
            img({
              className: [Cmp.CLOSE_BUTTON, "undefined"].join(" "),
              src: CLOSE_BUTTON_SVG,
              style: `transform: rotate(45deg) scale(0.5);
              `,
            })
          )
        )
      )
    )
  );
}

/** Manages the intialization of the Git menu */
export const gitMenu = new GitMenu();
