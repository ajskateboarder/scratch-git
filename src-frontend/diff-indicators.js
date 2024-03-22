/** @file Displays indicators and info on sprites that were changed */
import { Cmp } from "./dom/index";
import { html } from "./utils";

const DELETE = html`<div
  aria-label="Diff"
  class="${Cmp.DELETE_BUTTON} ${Cmp.SELECTOR_ITEM_DELETE_BUTTON} diffButton"
  role="button"
  tabindex="0"
>
  <div class="${Cmp.DELETE_BUTTON_VISIBLE}">
    <i class="fa-solid fa-plus-minus fa-lg"></i>
  </div>
</div>`;

const STAGE_DELETE = html`<div
  aria-label="Diff"
  class="${Cmp.DELETE_BUTTON} ${Cmp.SELECTOR_ITEM_DELETE_BUTTON} stageDiffButton"
  role="button"
  tabindex="0"
  style="margin-top: 40px; scale: 0.8; z-index: 99999;"
>
  <div class="delete-button_delete-button-visible_1BxMC">
    <i class="fa-solid fa-plus-minus fa-sm"></i>
  </div>
</div>`;

/** @param {import("./api").Project} project  */
export async function showIndicators(project) {
  let changedSprites = await project.getSprites();
  [
    ...document.querySelectorAll(`.diffButton`),
    ...document.querySelectorAll(`.stageDiffButton`),
  ].forEach((e) => e.remove());
  let sprites = [...document.querySelector(`.${Cmp.SPRITES}`).children];

  sprites.forEach((sprite) => {
    let divs = sprite.querySelector("div").querySelectorAll("div");
    let spriteName = divs[2].innerText;
    sprite.addEventListener("click", () => {
      [
        ...document.querySelectorAll(
          `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
        ),
      ]
        .filter((button) => !button.classList.contains("stageDiffButton"))
        .forEach((button) => {
          button.style.marginTop = "0px";
        });
    });

    if (!changedSprites.some((e) => e[0] === spriteName && !e[1])) return;
    let applyMargin = sprite.querySelector(`.${Cmp.DELETE_BUTTON}`) !== null;
    /** @type {HTMLElement} */
    let diffButton = new DOMParser()
      .parseFromString(DELETE, "text/html")
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

  // creates a diff button for the stage
  let stageWrapper = document.querySelector(`.${Cmp.STAGE_WRAPPER}`);

  if (changedSprites.some((e) => JSON.stringify(e) == '["Stage",true]')) {
    let stageDiffButton = new DOMParser()
      .parseFromString(STAGE_DELETE, "text/html")
      .querySelector(`.${Cmp.DELETE_BUTTON}`);
    stageDiffButton.onclick = async (e) => {
      e.stopPropagation();
      await document
        .querySelector("dialog[is='diff-modal']")
        .diff(project, "Stage (stage)");
    };
    stageWrapper.querySelector("img").after(stageDiffButton);
  }
  stageWrapper.onclick = () => {
    [
      ...document.querySelectorAll(
        `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
      ),
    ]
      .filter((button) => !button.classList.contains("stageDiffButton"))
      .forEach((button) => (button.style.marginTop = "0px"));
  };
}
