/** @file Displays indicators and info on sprites that were changed */
import { Cmp } from "./dom/index";
import { van } from "./lib/index";
import { ElemType } from "./lib/van";
import { DiffModal } from "./modals/diff";

const { div, i } = van.tags;

const BaseDelete: ElemType<"div"> = (props, children: HTMLDivElement) =>
  div(
    {
      ariaLabel: "Diff",
      role: "button",
      tabIndex: 0,
      ...props,
    },
    children
  );

const SpriteDiff: ElemType<"div"> = (props) =>
  BaseDelete(
    {
      className: [
        Cmp.DELETE_BUTTON,
        Cmp.SELECTOR_ITEM_DELETE_BUTTON,
        "diff-button",
      ].join(" "),
      ...props,
    },
    div(
      { className: Cmp.DELETE_BUTTON_VISIBLE },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" "),
        style: "color: white",
      })
    )
  );

const StageDiff: ElemType<"div"> = (props) =>
  BaseDelete(
    {
      className: [
        Cmp.DELETE_BUTTON,
        Cmp.SELECTOR_ITEM_DELETE_BUTTON,
        "stage-diff",
      ].join(" "),
      ...props,
    },
    div(
      { className: Cmp.DELETE_BUTTON_VISIBLE },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-sm"].join(" "),
        style: "color: white",
      })
    )
  );

/** @param {import("./api").Project} project  */
export async function showIndicators(project) {
  let changedSprites = await project.getSprites();
  // @ts-ignore
  let sprites = [...document.querySelector(`.${Cmp.SPRITES}`).children];

  sprites.forEach((sprite) => {
    let divs = sprite
      .querySelector("div")!
      .querySelectorAll("div") as NodeListOf<HTMLDivElement>;
    let spriteName = divs[2].innerText;
    sprite.addEventListener("click", () => {
      (<HTMLDivElement[]>[
        ...document.querySelectorAll(
          `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
        ),
      ])
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
      border-radius: 20px;
      transition: scale 0.15 ease-out, box-shadow 0.15 ease-out;
      scale: 0.8;
      z-index: 99999;
    `,
      onmouseover: () => {
        diffButton.style.scale = "0.9";
        diffButton.style.boxShadow = "0px 0px 0px 6px var(--looks-transparent)";
      },
      onmouseleave: () => {
        diffButton.style.scale = "0.8";
        diffButton.style.boxShadow = "0px 0px 0px 2px var(--looks-transparent)";
      },
      onclick: async (e) => {
        e.stopPropagation();
        (document.querySelector("dialog[is='diff-modal']") as DiffModal).diff(
          project,
          spriteName
        );
      },
    });
    divs[3].after(diffButton);

    sprite.addEventListener("click", async () => {
      const changedSpriteElement: HTMLDivElement = await new Promise(
        (resolve) => {
          const observer = new MutationObserver(() => {
            resolve(
              document.querySelector<HTMLDivElement>(`.${Cmp.SELECTED_SPRITE}`)!
            );
          });
          observer.observe(
            document.querySelector(`.${Cmp.SELECTED_SPRITE}`) ?? document.body,
            {
              childList: true,
              subtree: true,
            }
          );
        }
      );
      diffButton.style.marginTop =
        changedSpriteElement.querySelectorAll("div")[2].innerText === spriteName
          ? "30px"
          : "0px";
    });
  });

  // creates a diff button for the stage
  let stageWrapper: HTMLDivElement = document.querySelector(
    `.${Cmp.STAGE_WRAPPER}`
  )!;

  if (changedSprites.some((e) => JSON.stringify(e) == '["Stage",true]')) {
    let stageDiffButton = StageDiff({
      style: `
      transition: scale 0.15 ease-out, box-shadow 0.15 ease-out;
      scale: 0.8;
      border-radius: 20px;
      box-shadow: 0px 0px 0px 2px var(--looks-transparent);
    `,
      onmouseover: () => {
        stageDiffButton.style.scale = "0.9";
        stageDiffButton.style.boxShadow =
          "0px 0px 0px 6px var(--looks-transparent)";
      },
      onmouseleave: () => {
        stageDiffButton.style.scale = "0.8";
        stageDiffButton.style.boxShadow =
          "0px 0px 0px 2px var(--looks-transparent)";
      },
      onclick: async (e) => {
        e.stopPropagation();
        document
          .querySelector<DiffModal>("dialog[is='diff-modal']")!
          .diff(project, "Stage (stage)");
      },
    });
    stageWrapper.querySelector("img")!.after(stageDiffButton);
  }

  stageWrapper.onclick = () => {
    (<HTMLDivElement[]>[
      ...document.querySelectorAll(
        `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
      ),
    ])
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));
  };
}
