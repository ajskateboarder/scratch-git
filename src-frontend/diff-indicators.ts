/** @file Displays indicators and info on sprites that were changed */
import { type Project } from "./api";
import { Cmp } from "./dom/index";
import van from "vanjs-core";
import { DiffModal } from "./modals/diff";
import { diff, parseScripts } from "./modals/diff/utils";

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

const StageDiff = (props: {}) =>
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

/** Receive Blockly IDs to top-level blocks that were changed */
async function changedBlocklyScripts(
  project: Project,
  sprite: (string | boolean)[],
  loadedJSON: any
) {
  let spriteName: string = sprite[0] + (sprite[1] ? " (stage)" : "");
  let currentScripts = await project.getCurrentScripts(spriteName);

  let scripts = parseScripts(
    await project.getPreviousScripts(spriteName),
    currentScripts
  );

  let diffs = (
    await Promise.all(
      scripts.results.map((script) => {
        return diff(script.oldContent, script.newContent);
      })
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts.results[i] }))
    .filter((result) => result.diffed !== "" && result.status !== "error");

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

/** Applies a diff block glow that displays while a script runs */
function applyDiffFilter() {
  if (document.querySelector("filter#blocklyStackDiffFilter")) return;

  let defs = document.querySelector(".blocklySvg defs")!;
  defs.innerHTML += `<filter id="blocklyStackDiffFilter" height="160%" width="180%" y="-30%" x="-40%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4"></feGaussianBlur>
    <feComponentTransfer result="outBlur">
      <feFuncA type="table" tableValues="0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"></feFuncA>
    </feComponentTransfer>
    <feFlood flood-color="#b10d99" flood-opacity="1" result="outColor"></feFlood>
    <feComposite in="outColor" in2="outBlur" operator="in" result="outGlow"></feComposite>
    <feComposite in="SourceGraphic" in2="outGlow" operator="over"></feComposite>
  </filter>`;
}

/** Shows buttons to display changes and highlight changed scripts */
export async function showIndicators(project: Project) {
  let changedSprites = await project.getSprites();
  let sprites = [...document.querySelector(`.${Cmp.SPRITES}`)!.children];
  let loadedJSON = JSON.parse(window.vm.toJSON());

  const nameOfSprite = (element: HTMLElement) =>
    element.querySelectorAll("div")[2].innerText;

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
        nameOfSprite(changedSpriteElement) === spriteName ? "30px" : "0px";
      applyDiffFilter();
      (
        await changedBlocklyScripts(
          project,
          changedSprites.find((e) => e[0] === spriteName)!,
          loadedJSON
        )
      ).forEach((e) => {
        console.log(
          window.Blockly.getMainWorkspace().getBlockById(e).svgGroup_
        );
      });
    });
  });

  let selectedSpriteName = nameOfSprite(
    document.querySelector(`.${Cmp.SELECTED_SPRITE}`)!
  );
  applyDiffFilter();
  (
    await changedBlocklyScripts(
      project,
      changedSprites.find((e) => e[0] === selectedSpriteName)!,
      loadedJSON
    )
  ).forEach((e) => {
    let group = window.Blockly.getMainWorkspace().getBlockById(e).svgGroup_;
    group.setAttribute("filter", "url(#blocklyStackDiffFilter)");
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
        `.${Cmp.DELETE_BUTTON}.${Cmp.SELECTOR_ITEM_DELETE_BUTTON}`
      ),
    ])
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));
    applyDiffFilter();
    (await changedBlocklyScripts(project, ["Stage", true], loadedJSON)).forEach(
      (e) => {
        console.log(
          window.Blockly.getMainWorkspace().getBlockById(e).svgGroup_
        );
      }
    );
  };
}
