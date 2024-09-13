import { getBlockly } from "@/lib";

interface Item {
  title: string;
  onclick: () => void;
};

const waitForElm = <T extends Element>(selector: string): Promise<T> =>
  new Promise((resolve) => {
    if (document.querySelector(selector))
      return resolve(document.querySelector(selector) as T);
    const observer = new MutationObserver(() => {
      if (document.querySelector(selector)) {
        observer.disconnect();
        resolve(document.querySelector(selector) as T);
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

class ContextMenu {
  onopen: (target: SVGElement) => any = () => {};

  constructor() {
    this.listenOpens();
  }

  private listenOpens(): void {
    waitForElm<SVGGElement>("g.blocklyBlockCanvas").then((workspace) => {
      workspace.oncontextmenu = (_e: Event) => {
        // find the main stack from any selected part of the stack
        const topBlocks = getBlockly().topBlocks_.map((e) => e.id);
        let target = _e.target as SVGElement;
        const topStack = (block: SVGElement) => {
          const closest = block.closest<SVGElement>("[data-id]");
          if (
            block.dataset.id === closest?.dataset.id &&
            !topBlocks.includes(closest!.dataset.id ?? "")
          )
            return topStack(closest?.parentElement as unknown as SVGElement);
          if (topBlocks.includes(closest!.dataset.id ?? "")) return closest;
          return topStack(closest!);
        };
        target = topStack(target)!;
        this.onopen(target);
      };
    });
  }

  setCustomItem(item: Item) {
    const blocklyMenu = document
      .querySelector("div.goog-menu.goog-menu-vertical.blocklyContextMenu")
      ?.querySelectorAll(".goog-menuitem");
    if (!blocklyMenu) return;

    const menuItem = blocklyMenu[blocklyMenu.length - 1].cloneNode(
      true
    ) as HTMLElement;
    menuItem.removeAttribute("id");
    menuItem.removeAttribute("aria-disabled");
    // random id to prevent conflicting items
    menuItem.setAttribute("data-sm-id", Math.random().toString(36).slice(2));
    menuItem.classList.remove("goog-menuitem-disabled");
    menuItem.querySelector(".goog-menuitem-content")!.textContent = item.title;

    Object.assign(menuItem, {
      onclick: () => {
        item.onclick();
        this.close();
      },
      onmouseenter: () => {
        menuItem.classList.add("goog-menuitem-highlight");
      },
      onmouseleave: () => {
        menuItem.classList.remove("goog-menuitem-highlight");
      },
    });

    document
      .querySelector(
        ".blocklyWidgetDiv .goog-menu > .sa-blockly-menu-item-border"
      )!
      .after(menuItem);
    // when extra items are added, the height of the menu remains fixed
    document.querySelector<HTMLDivElement>(
      ".blocklyContextMenu"
    )!.style.maxHeight = "1000000%";
  }

  close() {
    document
      .querySelector("div.goog-menu.goog-menu-vertical.blocklyContextMenu")
      ?.remove();
  }
}

export const contextMenu = new ContextMenu();
