import { s } from "./accessors";
import { getReactHandlers } from "@/utils";

export let $menu: HTMLDivElement;
let events: string;

const updateMenu = () => {
  $menu = s("menu-bar_menu-bar-item").selectAll<HTMLDivElement>("div")[1];
  events = getReactHandlers($menu);
};

updateMenu();

/** Toggle menu between open and closed */
export const toggleMenu = (open: boolean) => {
  // fake event object to control the menu
  // TurboWarp/scratch-gui/src/components/menu-bar/tw-menu-label.jsx#L33-L44
  ($menu as any)[events].onClick({
    target: {
      closest: () => (open ? $menu : document.body),
    },
  });
};

/** Open a project SB3 file from a file dialog */
export const openProject = () => {
  const realConfirm = window.confirm;
  window.confirm = () => true;
  toggleMenu(true);
  const loadFromComputer: any = $menu.querySelectorAll("li")[2];
  loadFromComputer[events].onClick();
  toggleMenu(false);
  toggleMenu(true);
  window.confirm = realConfirm;
};

/** Returns if a project is currently open */
export const projectOpen = () => {
  toggleMenu(true);
  let savedMenu = $menu.cloneNode(true) as HTMLElement;
  // tends to occur with translations
  if (!savedMenu.querySelector("li")) {
    updateMenu();
    toggleMenu(true);
    savedMenu = $menu.cloneNode(true) as HTMLElement;
  }
  toggleMenu(false);
  toggleMenu(true);
  return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
};
