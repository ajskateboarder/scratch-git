/** @file Displays indicators and info on sprites that were changed */
import type { Project } from "./api.ts";
import { sprites } from "./dom/index";
import van from "vanjs-core";
import type { DiffModal } from "./modals/diff";
import { parseScripts } from "./modals/diff/scripts.ts";

const { div, i } = van.tags;

const BaseDelete = (props: {}, children: HTMLDivElement) =>
  div(
    {
      ariaLabel: "Diff",
      role: "button",
      tabIndex: 0,
      ...props,
    },
    children
  );

const SpriteDiff = (props: {}) =>
  BaseDelete(
    {
      className: [sprites.delete, sprites.spriteSelDelete, "diff-button"].join(
        " "
      ),
      ...props,
    },
    div(
      { className: sprites.visibleDelete },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" "),
        style: "color: white",
      })
    )
  );

const StageDiff = (props: {}) =>
  BaseDelete(
    {
      className: [sprites.delete, sprites.spriteSelDelete, "stage-diff"].join(
        " "
      ),
      ...props,
    },
    div(
      { className: sprites.visibleDelete },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-sm"].join(" "),
        style: "color: white",
      })
    )
  );

/** Receive Blockly IDs to top-level blocks that were changed */
async function changedBlocklyScripts(
  project: Project,
  sprite: (string | boolean)[],
  loadedJSON: any
) {
  let spriteName: string = sprite[0] + (sprite[1] ? " (stage)" : "");

  let diffs = await parseScripts(
    await project.getPreviousScripts(spriteName),
    await project.getCurrentScripts(spriteName)
  );

  let target = loadedJSON.targets.find((e: any) =>
    spriteName.includes("(stage)") ? e.isStage : e.name === spriteName
  );

  let topLevels = Object.keys(target.blocks).filter(
    (k) => target.blocks[k].parent === null
  );

  return diffs
    .map(
      (e) =>
        window.Blockly.getMainWorkspace().topBlocks_[
          topLevels.indexOf(e.script)
        ]?.id
    )
    .filter((e) => e !== undefined);
}

function applyDiffFilter() {
  if (document.querySelector("filter#blocklyStackDiffFilter")) return;

  document.querySelector(".blocklySvg defs")!.innerHTML +=
    `<filter id="blocklyStackDiffFilter" height="160%" width="180%" y="-30%" x="-40%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4"></feGaussianBlur>
    <feComponentTransfer result="outBlur">
      <feFuncA type="table" tableValues="0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"></feFuncA>
    </feComponentTransfer>
    <feFlood flood-color="#ed25cf" flood-opacity="1" result="outColor"></feFlood>
    <feComposite in="outColor" in2="outBlur" operator="in" result="outGlow"></feComposite>
    <feComposite in="SourceGraphic" in2="outGlow" operator="over"></feComposite>
  </filter>`;
}

async function highlightChanged(
  project: Project,
  sprite: (string | boolean)[],
  loadedJSON: any
) {
  applyDiffFilter();
  document
    .querySelectorAll<HTMLElement>(`g[was-changed="true"]`)
    .forEach((e) => (e.style.filter = ""));
  let changedScripts = await changedBlocklyScripts(project, sprite, loadedJSON);
  window._changedScripts = changedScripts;
  changedScripts.forEach((e) => {
    let group: HTMLElement =
      window.Blockly.getMainWorkspace().getBlockById(e).svgGroup_;
    group.style.filter = "url(#blocklyStackDiffFilter)";
    group.setAttribute("was-changed", "true");
  });
}

const nameOfSprite = (element: HTMLElement) =>
  element.querySelectorAll("div")[2].innerText;

/** Shows buttons to display changes and highlight changed scripts */
export async function showIndicators(project: Project) {
  let changedSprites = await project.getSprites();
  let _sprites = <HTMLElement[]>[
    ...document.querySelector(`.${sprites.sprites}`)!.children,
  ];
  let loadedJSON = JSON.parse(window.vm.toJSON());

  _sprites.forEach((sprite) => {
    let divs = sprite
      .querySelector("div")!
      .querySelectorAll("div") as NodeListOf<HTMLDivElement>;
    let spriteName = divs[2].innerText;

    sprite.addEventListener("click", () => {
      if (
        document.querySelector(`.${sprites.selectedSprite}`) &&
        spriteName ===
          nameOfSprite(document.querySelector(`.${sprites.selectedSprite}`)!) &&
        sprite.querySelector<HTMLDivElement>(".diff-button")?.style
          .marginTop === "30px"
      ) {
        return;
      }

      (<HTMLDivElement[]>[
        ...document.querySelectorAll(
          `.${sprites.delete}.${sprites.spriteSelDelete}`
        ),
      ])
        .filter((button) => !button.classList.contains("stage-diff-button"))
        .forEach((button) => {
          button.style.marginTop = "0px";
        });
    });

    if (!changedSprites.some((e) => e[0] === spriteName && !e[1])) return;

    let applyMargin = sprite.querySelector(`.${sprites.delete}`) !== null;
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
      onclick: async (e: Event) => {
        e.stopPropagation();
        (document.querySelector("dialog[is='diff-modal']") as DiffModal).diff(
          project,
          spriteName
        );
      },
    });
    divs[3].after(diffButton);

    sprite.addEventListener("click", async () => {
      const changedSprite: HTMLDivElement = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          resolve(
            document.querySelector<HTMLDivElement>(
              `.${sprites.selectedSprite}`
            )!
          );
        });
        observer.observe(
          document.querySelector(`.${sprites.selectedSprite}`) ?? document.body,
          {
            childList: true,
            subtree: true,
          }
        );
      });
      let changedSpriteName = nameOfSprite(changedSprite);

      diffButton.style.marginTop =
        changedSpriteName === spriteName ? "30px" : "0px";

      await highlightChanged(
        project,
        changedSprites.find((e) => e[0] === spriteName)!,
        loadedJSON
      );
    });
  });

  // creates a diff button for the stage
  let stageWrapper: HTMLDivElement = document.querySelector(
    `.${sprites.stageWrapper}`
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
      onclick: async (e: Event) => {
        e.stopPropagation();
        document
          .querySelector<DiffModal>("dialog[is='diff-modal']")!
          .diff(project, "Stage (stage)");
      },
    });
    stageWrapper.querySelector("img")!.after(stageDiffButton);
  }

  stageWrapper.onclick = async () => {
    (<HTMLDivElement[]>[
      ...document.querySelectorAll(
        `.${sprites.delete}.${sprites.spriteSelDelete}`
      ),
    ])
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));
    await highlightChanged(project, ["Stage", true], loadedJSON);
  };

  let selectedSprite: HTMLDivElement = document.querySelector(
    `.${sprites.selectedSprite}`
  )!;

  let sprite = (
    selectedSprite
      ? changedSprites.find((e) => e[0] === nameOfSprite(selectedSprite))
      : ["Stage", true]
  )!;

  await highlightChanged(project, sprite, loadedJSON);
}
