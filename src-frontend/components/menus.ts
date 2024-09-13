import { Menu, s } from "./accessors";
import { getReactHandlers } from "@/utils";
import van, { ChildDom } from "vanjs-core";

const { i, span } = van.tags;

/** Manages functions with the file menu */
// prettier-ignore
export const FileMenu = new class {
  $menu: HTMLDivElement;
  private events: string;

  constructor() {
    this.updateMenu();
  }

  private updateMenu() {
    this.$menu = s("menu-bar_menu-bar-item").selectAll<HTMLDivElement>("div")[1];
    this.events = getReactHandlers(this.$menu);
  }

  /** Toggle menu between open and closed */
  toggleMenu(open: boolean) {
    // fake event object to control the menu
    // TurboWarp/scratch-gui/src/components/menu-bar/tw-menu-label.jsx#L33-L44
    (this.$menu as any)[this.events].onClick({
      target: {
        closest: () => (open ? this.$menu : document.body),
      },
    });
  }

  /** Open a project SB3 file from a file dialog */
  openProject() {
    const realConfirm = window.confirm;
    window.confirm = () => true;
    this.toggleMenu(true);
    const loadFromComputer: any = this.$menu.querySelectorAll("li")[2];
    loadFromComputer[this.events].onClick();
    this.toggleMenu(false);
    this.toggleMenu(true);
    window.confirm = realConfirm;
  }

  /** Returns if a project is currently open */
  projectOpen() {
    this.toggleMenu(true);
    let savedMenu = this.$menu.cloneNode(true) as HTMLElement;
    // tends to occur with translations
    if (!savedMenu.querySelector("li")) {
      this.updateMenu();
      this.toggleMenu(true);
      savedMenu = this.$menu.cloneNode(true) as HTMLElement;
    }
    this.toggleMenu(false);
    this.toggleMenu(true);
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
};

// prettier-ignore
export const GitMenu = new class {
  private savedItems: HTMLElement | undefined;
  private newMenu: HTMLElement | undefined;

  private open = false;
  private menuInit = false;
  private handlerInit = false;

  constructor() { }

  private item(index: number) {
    const li = this.savedItems!.querySelectorAll("li")[index - 1];

    return Object.assign(li, {
      onclick: (handler: () => any) => {
        if (this.handlerInit) return;

        li.addEventListener("click", async (e) => {
          e.stopPropagation();
          this.newMenu!.classList.remove(Menu.activeMenuItem);
          this.savedItems!.style.display = "none";
          this.open = false;
          await handler();
        });
      },
      label(e: ChildDom) {
        li.innerHTML = "";
        li.append(e as Node);
      },
    });
  }

  /** Initialize the Git menu */
  create(
    {
      push,
      pull,
      repoConfig,
      commitView,
      commitCreate,
      settings
    }: Record<string, () => any>,
  ) {
    if (this.menuInit) return;

    // open, copy, and edit the file menu
    FileMenu.toggleMenu(false);
    FileMenu.toggleMenu(true);
    this.newMenu = FileMenu.$menu.cloneNode(true) as HTMLDivElement;
    FileMenu.$menu.after(this.newMenu);
    this.newMenu.classList.remove(Menu.activeMenuItem);
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
      span(i({ class: "fa-solid fa-upload" }), " ", "Push")
    );
    this.item(1).onclick(push);

    this.item(2).label(
      span(i({ class: "fa-solid fa-download" }), " ", "Pull")
    );
    this.item(2).onclick(pull);

    this.item(5).label(
      span(i({ class: "fa-solid fa-bars" }), " ", "Setup repository")
    );
    this.item(5).onclick(repoConfig);

    // wrap the item in a span to show commit title right
    this.item(3).outerHTML = `<span>${this.item(3).outerHTML}</span>`;
    this.item(3).label(span(i({class: "fa-solid fa-check"}), " ", "Commit"));
    this.item(3).onclick(commitCreate);

    this.item(4).label(
      span(
        i({ class: "fa-solid fa-code-commit" }),
        " ",
        "View commits"
      )
    );
    this.item(4).onclick(commitView);

    this.item(6).remove();
    this.item(6).label(span(i({ class: "fa-solid fa-cog" }), " ", "Settings"))
    this.item(6).onclick(settings);
    this.item(6).classList.remove(Menu.section);

    this.item(5).classList.add(Menu.section);

    this.handlerInit = true;

    // make new menu toggle-able
    this.newMenu.onclick = () => {
      if (this.savedItems!.style.display === "none") {
        this.newMenu!.classList.add(Menu.activeMenuItem);
        this.savedItems!.style.display = "block";
        this.open = true;

        const itemRef = this.item(3);
        const commitsAhead = window._repoStatus.commits_ahead;

        if (commitsAhead !== 0 && !this.item(1).getAttribute("disabled")) {
          itemRef.parentElement!.title = `${commitsAhead} commit${commitsAhead > 1 ? "s" : ""} ahead`;
        } else {
          itemRef.parentElement!.setAttribute("title", "");
        }

        if (window._repoStatus.status === 1) {
          itemRef.style.cssText = "pointer-events: none; opacity: 0.5"
          itemRef.parentElement!.style.cursor = "default";
        } else {
          itemRef.setAttribute("style", "");
          itemRef.parentElement!.style.cursor = "pointer";
        }
      } else {
        this.newMenu!.classList.remove(Menu.activeMenuItem);
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
          this.newMenu!.classList.remove(Menu.activeMenuItem);
          this.savedItems!.style.display = "none";
          this.open = false;
        }
      });

    FileMenu.toggleMenu(true);
    this.menuInit = true;
  }

  /** Enable/disable the pushing and pulling menu options */
  setPushPullStatus(enabled: boolean) {
    if (!enabled) {
      this.item(1).setAttribute("disabled", "");
      this.item(1).setAttribute("title", "Please set up a repository to use this");
      this.item(2).setAttribute("disabled", "");
      this.item(2).setAttribute("title", "Please set up a repository to use this");
    } else {
      this.item(1).removeAttribute("disabled");
      this.item(1).removeAttribute("title");
      this.item(2).removeAttribute("disabled");
      this.item(2).removeAttribute("title");
    }
  }
};
