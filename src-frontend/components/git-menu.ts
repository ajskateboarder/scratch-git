import van, { ChildDom } from "vanjs-core";
import { Menu } from "./accessors";
import * as FileMenu from "./file-menu";

const { i, span } = van.tags;

let savedItems: HTMLElement | undefined;
let newMenu: HTMLElement | undefined;

let open = false;
let menuInit = false;
let handlerInit = false;

const item = (index: number) => {
  const li = savedItems!.querySelectorAll("li")[index - 1];

  return Object.assign(li, {
    onclick: (handler: () => any) => {
      if (handlerInit) return;

      li.addEventListener("click", async (e) => {
        e.stopPropagation();
        newMenu!.classList.remove(Menu.activeMenuItem);
        savedItems!.style.display = "none";
        open = false;
        await handler();
      });
    },
    label(e: ChildDom) {
      li.innerHTML = "";
      li.append(e as Node);
    },
  });
};

/** Initialize the Git menu */
export const createMenu = ({
  push,
  pull,
  repoConfig,
  commitView,
  commitCreate,
  settings,
}: Record<string, () => any>) => {
  if (menuInit) return;

  // open, copy, and edit the file menu
  FileMenu.toggleMenu(false);
  FileMenu.toggleMenu(true);
  newMenu = FileMenu.$menu.cloneNode(true) as HTMLDivElement;
  FileMenu.$menu.after(newMenu);
  newMenu.classList.remove(Menu.activeMenuItem);
  newMenu.querySelector("span")!.innerText = "Git";
  savedItems = newMenu
    .querySelector("ul")!
    .parentElement!.cloneNode(true) as HTMLElement;
  newMenu.querySelector("img")!.replaceWith(
    i({
      class: "fa fa-code-fork fa-lg",
    })
  );
  savedItems.classList.add("git-menu");
  newMenu.querySelector("ul")!.parentElement!.remove();
  savedItems.style.display = "none";
  newMenu.appendChild(savedItems);

  item(1).label(span(i({ class: "fa-solid fa-upload" }), " ", "Push"));
  item(1).onclick(push);

  item(2).label(span(i({ class: "fa-solid fa-download" }), " ", "Pull"));
  item(2).onclick(pull);

  item(5).label(
    span(i({ class: "fa-solid fa-bars" }), " ", "Setup repository")
  );
  item(5).onclick(repoConfig);

  // wrap the item in a span to show commit title right
  item(3).outerHTML = `<span>${item(3).outerHTML}</span>`;
  item(3).label(span(i({ class: "fa-solid fa-check" }), " ", "Commit"));
  item(3).onclick(commitCreate);

  item(4).label(
    span(i({ class: "fa-solid fa-code-commit" }), " ", "View commits")
  );
  item(4).onclick(commitView);

  item(6).remove();
  item(6).label(span(i({ class: "fa-solid fa-cog" }), " ", "Settings"));
  item(6).onclick(settings);
  item(6).classList.remove(Menu.section);

  item(5).classList.add(Menu.section);

  handlerInit = true;

  // make new menu toggle-able
  newMenu.onclick = () => {
    if (savedItems!.style.display === "none") {
      newMenu!.classList.add(Menu.activeMenuItem);
      savedItems!.style.display = "block";
      open = true;

      const itemRef = item(3);
      const commitsAhead = window._repoStatus.commits_ahead;

      if (commitsAhead !== 0 && !item(1).getAttribute("disabled")) {
        itemRef.parentElement!.title = `${commitsAhead} commit${
          commitsAhead > 1 ? "s" : ""
        } ahead`;
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
      newMenu!.classList.remove(Menu.activeMenuItem);
      savedItems!.style.display = "none";
      open = false;
    }
  };

  // close new menu upon clicking anywhere outside of the menu
  document
    .querySelector<HTMLDivElement>("#app")!
    .addEventListener("mouseup", (e) => {
      if (
        e.target !== newMenu &&
        (e.target as HTMLElement)!.parentNode !== newMenu &&
        open
      ) {
        newMenu!.classList.remove(Menu.activeMenuItem);
        savedItems!.style.display = "none";
        open = false;
      }
    });

  FileMenu.toggleMenu(true);
  menuInit = true;
};

/** Enable/disable the pushing and pulling menu options */
export const setPushPullStatus = (enabled: boolean) => {
  for (const i of [1, 2]) {
    if (!enabled) {
      item(i).setAttribute("disabled", "");
      item(i).setAttribute("title", "Please set up a repository to use this");
    } else {
      item(i).removeAttribute("disabled");
      item(i).removeAttribute("title");
    }
  }
};
