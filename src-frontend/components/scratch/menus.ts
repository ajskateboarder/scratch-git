/** @file Manages creation of Git menu and alerts */

import i18next from "@/i18n";
import { menu } from "../accessors";
import van, { ChildDom } from "vanjs-core";

const { i, span } = van.tags;

/** Manages functions with the file menu */
export const fileMenu = new (class FileMenu {
  menu!: HTMLDivElement;
  private eventHandlers!: string;

  constructor() {
    this.setMenu();
  }

  setMenu() {
    this.menu = menu.menuItem.selectAll("div")[1] as HTMLDivElement;
    this.eventHandlers = Object.keys(this.menu).find((e) =>
      e.startsWith("__reactEventHandlers")
    )!;
  }

  /** Toggle menu between open and closed */
  toggleMenu(open: boolean) {
    // fake event object to control the menu
    // TurboWarp/scratch-gui/src/components/menu-bar/tw-menu-label.jsx#L33-L44
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
    let savedMenu = this.menu.cloneNode(true) as HTMLElement;
    // tends to occur with translations
    if (!savedMenu.querySelector("li")) {
      this.setMenu();
      this.toggleMenu(true);
      savedMenu = this.menu.cloneNode(true) as HTMLElement;
    }
    this.toggleMenu(false);
    this.toggleMenu(true);
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
})();

export const gitMenu = new (class GitMenu {
  private savedItems: HTMLElement | undefined;
  private newMenu: HTMLElement | undefined;
  private open: boolean = false;
  private initialized: boolean = false;

  constructor() {}

  private item(index: number) {
    const li = this.savedItems!.querySelectorAll("li")[index - 1];
    return Object.assign(li, {
      onclick: (handler: () => any) => {
        li.addEventListener("click", async (e) => {
          e.stopPropagation();
          this.newMenu!.classList.remove(menu.activeMenuItem);
          this.savedItems!.style.display = "none";
          this.open = false;
          await handler();
        });
      },
      label: (e: ChildDom) => {
        li.innerHTML = "";
        li.append(e as Node);
      },
    });
  }

  /**
   * Initialize the Git menu
   *
   * @param push - handler to push code to remote
   * @param pull - handler to pull code from remote
   * @param repoConfig - handler to configure repo
   * @param commitView - handler to view commits
   * @param commitCreate - handler to create commit
   */
  create(
    {
      push,
      pull,
      repoConfig,
      commitView,
      commitCreate,
    }: {
      push: () => any;
      pull: () => any;
      repoConfig: () => any;
      commitView: () => any;
      commitCreate: () => any;
    },
    locale: string | undefined
  ) {
    if (this.initialized && !locale) return;
    if (locale) document.querySelector(".git-menu")?.remove();
    i18next.changeLanguage(locale);

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
      i({
        class: "fa fa-code-fork fa-lg",
      })
    );
    this.savedItems.classList.add("git-menu");
    this.newMenu.querySelector("ul")!.parentElement!.remove();
    this.savedItems.style.display = "none";
    this.newMenu.appendChild(this.savedItems);

    this.item(1).label(
      span(i({ class: "fa-solid fa-upload" }), " ", i18next.t("menu.push"))
    );
    this.item(1).onclick(push);
    this.item(2).label(
      span(i({ class: "fa-solid fa-download" }), " ", i18next.t("menu.pull"))
    );
    this.item(2).onclick(pull);
    this.item(3).label(
      span(
        i({ class: "fa-solid fa-bars" }),
        " ",
        i18next.t("menu.configure-repo")
      )
    );
    this.item(3).onclick(repoConfig);
    this.item(4).label(
      span(
        i({ class: "fa-solid fa-code-commit" }),
        " ",
        i18next.t("menu.view-commits")
      )
    );
    this.item(4).onclick(commitView);
    this.item(5).remove();
    this.item(5).label(i18next.t("menu.commit"));
    this.item(5).onclick(commitCreate);
    this.item(6).remove();

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
    document
      .querySelector<HTMLDivElement>("#app")!
      .addEventListener("mouseup", (e) => {
        if (
          e.target !== this.newMenu &&
          (e.target as HTMLElement)!.parentNode !== this.newMenu &&
          this.open
        ) {
          this.newMenu!.classList.remove(menu.activeMenuItem);
          this.savedItems!.style.display = "none";
          this.open = false;
        }
      });

    fileMenu.toggleMenu(true);
    this.initialized = true;
  }
})();
