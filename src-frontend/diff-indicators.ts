/** @file Displays indicators and info on sprites that were changed */
import type { Project, Sprite } from "./api";
import { misc, sprites } from "./components/index";
import type { DiffModal } from "./modals";
import { parseScripts } from "./scripts";
import { SpriteDiff, StageDiff } from "./components/diff-buttons";

/** Receive Blockly IDs to top-level blocks that were changed
 *
 * @param project - a {@link Project}
 * @param sprite - the {@link Sprite} in which blocks were changed
 * @param loadedJSON - the current JSON loaded in the editor (fetched through vm)
 */
async function changedBlocklyScripts(
  sprite: Sprite,
  loadedJSON: any,
  previousScripts: any,
  currentScripts: any
) {
  if (sprite === undefined) {
    console.warn("provided sprite for diffing was undefined");
    return;
  }

  const topLevels = () => {
    let target = loadedJSON.targets.find((e: any) =>
      spriteName.includes("(stage)") ? e.isStage : e.name === spriteName
    );

    return Object.keys(target.blocks).filter(
      (k) => target.blocks[k].parent === null
    );
  };

  let spriteName: string = sprite.format();
  let workspace = window.Blockly.getMainWorkspace();

  let diffs = await parseScripts(previousScripts, currentScripts);

  return diffs
    .map((e) => workspace.topBlocks_[topLevels().indexOf(e.script)]?.id)
    .filter((e) => e !== undefined) as string[];
}

const STAGE: Sprite = {
  name: "Stage",
  isStage: true,
  format() {
    return "Stage (stage)";
  },
};

async function highlightChanged(
  project: Project,
  sprite: Sprite,
  loadedJSON: any
) {
  if (!document.querySelector("filter#blocklyStackDiffFilter")) {
    document.querySelector(
      ".blocklySvg defs"
    )!.innerHTML += `<filter id="blocklyStackDiffFilter" height="160%" width="180%" y="-30%" x="-40%">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4"></feGaussianBlur>
      <feComponentTransfer result="outBlur">
        <feFuncA type="table" tableValues="0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"></feFuncA>
      </feComponentTransfer>
      <feFlood flood-color="#ed25cf" flood-opacity="1" result="outColor"></feFlood>
      <feComposite in="outColor" in2="outBlur" operator="in" result="outGlow"></feComposite>
      <feComposite in="SourceGraphic" in2="outGlow" operator="over"></feComposite>
    </filter>`;
  }

  document
    .querySelectorAll<HTMLElement>(`g[was-changed="true"]`)
    .forEach((e) => (e.style.filter = ""));

  let previousScripts = await project.getPreviousScripts(sprite.format());
  let currentScripts = await project.getCurrentScripts(sprite.format());

  let changedScripts = await changedBlocklyScripts(
    sprite,
    loadedJSON,
    previousScripts,
    currentScripts
  );

  console.debug(
    `received following for sprite ${sprite.format()}`,
    changedScripts
  );

  if (changedScripts === undefined) return;

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
  let changedSprites = await project.getSprites(),
    _sprites = <HTMLElement[]>[
      ...document.querySelector(`.${sprites.sprites}`)!.children,
    ],
    loadedJSON = JSON.parse(window.vm.toJSON());

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
        .forEach((button) => (button.style.marginTop = "0px"));
    });

    // was the selected sprite changed?
    if (!changedSprites.some((e) => e.name === spriteName && !e.isStage))
      return;

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

    // on sprite click, adjust diff buttons and highlight changed scripts
    sprite.addEventListener("click", async () => {
      let movedToSprite = nameOfSprite(
        await new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            resolve(
              document.querySelector<HTMLDivElement>(
                `.${sprites.selectedSprite}`
              )!
            );
          });
          observer.observe(
            document.querySelector(`.${sprites.selectedSprite}`) ??
              document.body,
            {
              childList: true,
              subtree: true,
            }
          );
        })
      );

      diffButton.style.marginTop =
        movedToSprite === spriteName ? "30px" : "0px";

      await highlightChanged(
        project,
        changedSprites.find((e) => e.name === spriteName)!,
        loadedJSON
      );
    });
  });

  // creates a diff button for the stage
  let stageWrapper: HTMLDivElement = document.querySelector(
    `.${sprites.stageWrapper}`
  )!;

  if (changedSprites.some((e) => e.name === "Stage" && e.isStage)) {
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

  stageWrapper.addEventListener("click", async () => {
    (<HTMLDivElement[]>[
      ...document.querySelectorAll(
        `.${sprites.delete}.${sprites.spriteSelDelete}`
      ),
    ])
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));

    await highlightChanged(project, STAGE, loadedJSON);
  });

  let selectedSprite: HTMLDivElement = document.querySelector(
    `.${sprites.selectedSprite}`
  )!;

  let sprite = (
    selectedSprite
      ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
      : STAGE
  ) satisfies Sprite;

  await highlightChanged(project, sprite, loadedJSON);

  // retain diff highlights when switching between editor tabs
  new MutationObserver(async ([mutation, _]) => {
    if ((mutation.target as HTMLElement).classList.contains(misc.selectedTab)) {
      let selectedSprite: HTMLDivElement = document.querySelector(
        `.${sprites.selectedSprite}`
      )!;
      let sprite_ = selectedSprite
        ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
        : STAGE;
      await highlightChanged(project, sprite_, loadedJSON);
    }
  }).observe(document.querySelector("#react-tabs-0")!, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // retain diff highlights for editor theme
  new MutationObserver(async () => {
    let selectedSprite: HTMLDivElement = document.querySelector(
      `.${sprites.selectedSprite}`
    )!;
    let sprite_ = selectedSprite
      ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
      : STAGE;
    await highlightChanged(project, sprite_, loadedJSON);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
}
