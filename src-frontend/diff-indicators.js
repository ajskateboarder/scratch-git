/** @file Displays indicators and info on sprites that were changed */
import { Cmp } from "./dom/index";
import { html } from "./utils";

/** @param {import("./api").Project} project  */
export async function showIndicators(project) {
  let changedSprites = await project.getSprites();
  document.querySelectorAll(".diffButton").forEach((button) => button.remove());
  [...document.querySelector(`.${Cmp.SPRITES}`).children].forEach((sprite) => {
    let divs = sprite.querySelector("div").querySelectorAll("div");
    let spriteName = divs[2].innerText;
    sprite.addEventListener("click", () => {
      document
        .querySelectorAll(
          `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
        )
        .forEach((button) => (button.style.marginTop = "0px"));
    });

    if (!changedSprites.includes(spriteName)) return;

    let applyMargin = sprite.querySelector(`.${Cmp.DELETE_BUTTON}`) !== null;
    /** @type {HTMLElement} */
    let diffButton = new DOMParser()
      .parseFromString(
        html`<div
          aria-label="Delete"
          class="${Cmp.DELETE_BUTTON} ${Cmp.SELECTOR_ITEM_DELETE_BUTTON} diffButton"
          role="button"
          tabindex="0"
        >
          <div class="${Cmp.DELETE_BUTTON_VISIBLE}">
            <i class="fa-solid fa-plus-minus fa-lg"></i>
          </div>
        </div>`,
        "text/html"
      )
      .querySelector(`.${Cmp.DELETE_BUTTON}`);

    diffButton.style.marginTop = applyMargin ? "30px" : "0px";
    diffButton.style.transition =
      "scale 0.15 ease-out, box-shadow 0.15 ease-out";
    diffButton.style.scale = "0.8";
    diffButton.style.zIndex = "99999";
    diffButton.onmouseover = () => {
      diffButton.style.scale = "0.9";
    };
    diffButton.onmouseleave = () => {
      diffButton.style.scale = "0.8";
    };
    diffButton.onclick = async (e) => {
      e.stopPropagation();
      await document
        .querySelector("dialog[is='diff-modal']")
        .diff(project, spriteName);
    };
    divs[3].after(diffButton);

    sprite.addEventListener("click", async () => {
      const changedSpriteElement = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          resolve(document.querySelector(`.${Cmp.SELECTED_SPRITE}`));
        });
        observer.observe(
          document.querySelector(`.${Cmp.SELECTED_SPRITE}`) ?? document.body,
          {
            childList: true,
            subtree: true,
          }
        );
      });
      diffButton.style.marginTop =
        changedSpriteElement.querySelectorAll("div")[2].innerText === spriteName
          ? "30px"
          : "0px";
    });
  });

  document.querySelector(`.${Cmp.STAGE_WRAPPER}`).onclick = () => {
    document
      .querySelectorAll(
        `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
      )
      .forEach((button) => (button.style.marginTop = "0px"));
  };
}
