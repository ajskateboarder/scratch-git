/** @file Displays indicators and info on sprites that were changed */
import { Cmp } from "./dom/index";
import { van } from "./lib";

const { div, i } = van.tags;

const BaseDelete = (children, props = {}) =>
  div(
    {
      ariaLabel: "Diff",
      role: "button",
      tabIndex: 0,
      ...props,
    },
    children
  );

/** @type {import("./global").ElemType<HTMLDivElement>} */
const SpriteDiff = (props) =>
  BaseDelete(
    div(
      { className: Cmp.DELETE_BUTTON_VISIBLE },
      i({ className: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" ") })
    ),
    {
      className: [
        Cmp.DELETE_BUTTON,
        Cmp.SELECTOR_ITEM_DELETE_BUTTON,
        "diff-button",
      ].join(" "),
      ...props,
    }
  );

/** @type {import("./global").ElemType<HTMLDivElement>} */
const StageDiff = (props) =>
  BaseDelete(
    div(
      { className: Cmp.DELETE_BUTTON_VISIBLE },
      i({ className: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" ") })
    ),
    {
      className: [
        Cmp.DELETE_BUTTON,
        Cmp.SELECTOR_ITEM_DELETE_BUTTON,
        "stage-diff",
      ].join(" "),
      ...props,
    }
  );

/** @param {import("./api").Project} project  */
export async function showIndicators(project) {
  let changedSprites = await project.getSprites();
  [
    ...document.querySelectorAll(`.diff-button`),
    ...document.querySelectorAll(`.stage-diff-button`),
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
        .filter((button) => !button.classList.contains("stage-diff-button"))
        .forEach((button) => {
          button.style.marginTop = "0px";
        });
    });

    if (!changedSprites.some((e) => e[0] === spriteName && !e[1])) return;
    let applyMargin = sprite.querySelector(`.${Cmp.DELETE_BUTTON}`) !== null;
    /** @type {HTMLElement} */
    let diffButton = SpriteDiff({
      style: `
      margin-top: ${applyMargin ? "30px" : "0px"};
      transition: scale 0.15 ease-out, box-shadow 0.15 ease-out;
      scale: 0.8;
      z-index: 99999;
    `,
      onmouseover: () => {
        diffButton.style.scale = "0.9";
      },
      onmouseleave: () => {
        diffButton.style.scale = "0.8";
      },
      onclick: async (e) => {
        e.stopPropagation();
        await document
          .querySelector("dialog[is='diff-modal']")
          .diff(project, spriteName);
      },
    });
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
    let stageDiffButton = StageDiff({
      onclick: async (e) => {
        e.stopPropagation();
        await document
          .querySelector("dialog[is='diff-modal']")
          .diff(project, "Stage (stage)");
      },
    });
    stageWrapper.querySelector("img").after(stageDiffButton);
  }

  stageWrapper.onclick = () => {
    [
      ...document.querySelectorAll(
        `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
      ),
    ]
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));
  };
}
