/** @file Manages creation of Git menu and alerts */
import { menu, s } from "../accessors";
import i18next from "@/i18n";
import { getReactHandlers } from "@/core/utils";
import van, { ChildDom } from "vanjs-core";

const { i, span } = van.tags;

/** Manages functions with the file menu */
// prettier-ignore
export const fileMenu = new class {
  menu!: HTMLDivElement;
  private events!: string;

  constructor() {
    this.updateMenu();
  }

  private updateMenu() {
    this.menu = s("menu-bar_menu-bar-item").selectAll<HTMLDivElement>("div")[1];
    this.events = getReactHandlers(this.menu);
  }

  /** Toggle menu between open and closed */
  toggleMenu(open: boolean) {
    // fake event object to control the menu
    // TurboWarp/scratch-gui/src/components/menu-bar/tw-menu-label.jsx#L33-L44
    (this.menu as any)[this.events].onClick({
      target: {
        closest: () => (open ? this.menu : document.body),
      },
    });
  }

  /** Open a project SB3 file from a file dialog */
  openProject() {
    let root = document.querySelector("#app")!.firstElementChild!;
    (root as any)[
      getReactHandlers(root)
    ].children[11].props.onStartSelectingFileUpload();
  }

  /** Returns if a project is currently open */
  projectOpen() {
    this.toggleMenu(true);
    let savedMenu = this.menu.cloneNode(true) as HTMLElement;
    // tends to occur with translations
    if (!savedMenu.querySelector("li")) {
      this.updateMenu();
      this.toggleMenu(true);
      savedMenu = this.menu.cloneNode(true) as HTMLElement;
    }
    this.toggleMenu(false);
    this.toggleMenu(true);
    return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
  }
};

// prettier-ignore
export const gitMenu = new class {
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
          this.newMenu!.classList.remove(menu.activeMenuItem);
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

  /**
   * Initialize the Git menu
   *
   * @param push - handler to push code to remote
   * @param pull - handler to pull code from remote
   * @param repoConfig - handler to configure repo
   * @param settings - handle to change settings
   * @param commitView - handler to view commits
   * @param commitCreate - handler to create commits
   */
  create(
    {
      push,
      pull,
      repoConfig,
      commitView,
      commitCreate,
      settings
    }: Record<string, () => any>,
    locale: string | undefined
  ) {
    if (this.menuInit && !locale) return;
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

    this.item(5).label(
      span(i({ class: "fa-solid fa-bars" }), " ", i18next.t("menu.setup-repo"))
    );
    this.item(5).onclick(repoConfig);

    // wrap the item in a span to show commit title right
    this.item(3).outerHTML = `<span>${this.item(3).outerHTML}</span>`;
    this.item(3).label(span(i({class: "fa-solid fa-check"}), " ", i18next.t("menu.commit")));
    this.item(3).onclick(commitCreate);

    this.item(4).label(
      span(
        i({ class: "fa-solid fa-code-commit" }),
        " ",
        i18next.t("menu.view-commits")
      )
    );
    this.item(4).onclick(commitView);

    this.item(6).remove();
    this.item(6).label(span(i({ class: "fa-solid fa-cog" }), " ", i18next.t("menu.settings")))
    this.item(6).onclick(settings);
    this.item(6).classList.remove(menu.section);

    this.item(5).classList.add(menu.section);

    this.handlerInit = true;

    // make new menu toggle-able
    this.newMenu.onclick = () => {
      if (this.savedItems!.style.display === "none") {
        this.newMenu!.classList.add(menu.activeMenuItem);
        this.savedItems!.style.display = "block";
        this.open = true;

        const itemRef = this.item(3);
        const commitsAhead = window._repoStatus.commits_ahead;

        if (commitsAhead !== 0 && !this.item(1).getAttribute("disabled")) {
          // TODO: localize
          itemRef.parentElement!.title = `${commitsAhead} commit${commitsAhead > 1 ? "s" : ""} ahead`;
        } else {
          itemRef.parentElement!.setAttribute("title", "");
        }

        if (window._repoStatus.status === 1) {
          itemRef.style.pointerEvents = "none";
          itemRef.style.opacity = "0.5";
          itemRef.parentElement!.style.cursor = "default";
        } else {
          itemRef.setAttribute("style", "");
          itemRef.parentElement!.style.cursor = "pointer";
        }
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
    this.menuInit = true;
  }

  /** Enable/disable the pushing and pulling menu options
   *
   * @param enabled - whether to enable them
   */
  setPushPullStatus(enabled: boolean) {
    if (!enabled) {
      this.item(1).setAttribute("disabled", "");
      this.item(1).setAttribute("title", i18next.t("menu.repo-needed"));
      this.item(2).setAttribute("disabled", "");
      this.item(2).setAttribute("title", i18next.t("menu.repo-needed"));
    } else {
      this.item(1).removeAttribute("disabled");
      this.item(1).removeAttribute("title");
      this.item(2).removeAttribute("disabled");
      this.item(2).removeAttribute("title");
    }
  }
};
