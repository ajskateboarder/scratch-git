/** @file Manages creation of Git menu and alerts */

import { menu } from "./accessors.ts";

class FileMenu {
  menu: HTMLDivElement;
  eventHandlers: string;

  constructor() {
    this.menu = document.querySelectorAll<HTMLDivElement>(
      `div.${menu.menuItem}`
    )[1];
    this.eventHandlers = Object.keys(this.menu).find((e) =>
      e.startsWith("__reactEventHandlers")
    )!;
  }

  toggleMenu(open: boolean) {
    // we pass a fake event object to control the menu
    // https://github.com/TurboWarp/scratch-gui/blob/0ea490d0c1a744770fcca86fcb99eb23774d0219/src/components/menu-bar/tw-menu-label.jsx#L33-L44
    (this.menu as any)[this.eventHandlers].onClick({
      target: {
        closest: () => (open ? this.menu : document.body),
      },
    });
  }

  /** Opens a file picker dialog to load projects into TurboWarp */
  openProject() {
    this.toggleMenu(true);
    const loadFromComputer: any = this.menu.querySelectorAll("li")[2];
    loadFromComputer[this.eventHandlers].onClick();
    this.toggleMenu(false);
    this.toggleMenu(true);
  }

  /** Returns if a project is currently open */
  isProjectOpen() {
    this.toggleMenu(true);
    const savedMenu = new DOMParser().parseFromString(
      this.menu.innerHTML,
      "text/html"
    );
    this.toggleMenu(false);
    this.toggleMenu(true);
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
}

/** Manages functions with the file menu */
export const fileMenu = new FileMenu();

class GitMenu {
  savedItems: HTMLElement | undefined;
  newMenu: HTMLElement | undefined;
  open: boolean = false;
  initialized: boolean = false;

  constructor() {}

  // this way of modifying the menu sucks, but don't fix what ain't broke i guess
  item(index: number) {
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
          this.newMenu!.classList.remove(menu.activeMenuItem);
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
    repoConfig,
    commitView,
    commitCreate,
  }: {
    push: () => any;
    repoConfig: () => any;
    commitView: () => any;
    commitCreate: () => any;
  }) {
    if (this.initialized) return;

    // open, copy, and edit the file menu
    fileMenu.toggleMenu(false);
    fileMenu.toggleMenu(true);
    this.newMenu = fileMenu.menu.cloneNode(true) as HTMLDivElement;
    fileMenu.menu.after(this.newMenu);
    this.newMenu.classList.remove(menu.activeMenuItem);
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
    this.item(2).onclick(repoConfig);
    this.item(4).remove();
    this.item(4).remove();
    this.item(4).remove();
    this.item(4).elem.classList.remove(menu.menuSection);
    this.item(4).label("Commit");
    this.item(4).onclick(commitCreate);
    this.item(3).label("View commits");
    this.item(3).onclick(commitView);

    // make new menu toggle-able
    this.newMenu.onclick = () => {
      if (this.savedItems!.style.display === "none") {
        this.newMenu!.classList.add(menu.activeMenuItem);
        this.savedItems!.style.display = "block";
        this.open = true;
      } else {
        this.newMenu!.classList.remove(menu.activeMenuItem);
        this.savedItems!.style.display = "none";
        this.open = false;
      }
    };

    // close new menu upon clicking anywhere outside of the menu
    document.querySelector<HTMLDivElement>("#app")!.onmouseup = (e) => {
      if (
        e.target !== this.newMenu &&
        (e.target as HTMLElement)!.parentNode !== this.newMenu &&
        this.open
      ) {
        this.newMenu!.classList.remove(menu.activeMenuItem);
        this.savedItems!.style.display = "none";
        this.open = false;
      }
    };

    fileMenu.toggleMenu(true);
    this.initialized = true;
  }
}

/** Manages the intialization of the Git menu */
export const gitMenu = new GitMenu();
