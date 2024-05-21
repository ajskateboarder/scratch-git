/** @file Displays indicators and info on sprites that were changed */
import type { Project, Sprite } from "./api";
import { misc, sprites } from "./components/index";
import type { DiffModal } from "./modals";
import { parseScripts } from "./scripts";
import { SpriteDiff, StageDiff } from "./components/diff-buttons";
import { getBlockly } from "./lib/globals";

const STAGE: Sprite = {
  name: "Stage",
  isStage: true,
  format: () => "Stage (stage)",
};

/** Receive Blockly IDs to top-level blocks that were changed
 *
 * @param project - the project to retreieve changed scripts
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
  let workspace = getBlockly();

  let diffs = await parseScripts(previousScripts, currentScripts);

  return diffs
    .map((e) => workspace.topBlocks_[topLevels().indexOf(e.script)]?.id)
    .filter((e) => e !== undefined);
}

async function highlightChanged(
  project: Project,
  sprite: Sprite,
  loadedJSON: any
) {
  if (!document.querySelector("filter#blocklyStackDiffFilter")) {
    // diff highlight filter for scripts
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

  // persist this until the next save
  window._changedScripts = changedScripts;

  changedScripts.forEach((e) => {
    let group = getBlockly().getBlockById(e).svgGroup_;
    group.style.filter = "url(#blocklyStackDiffFilter)";
    group.setAttribute("was-changed", "true");
  });
}

const nameOfSprite = (element: HTMLElement) =>
  element.querySelectorAll("div")[2].innerText;

/** Shows buttons to display changes and highlight changed scripts
 *
 * @param project - the currently open project
 */
export async function showIndicators(project: Project) {
  let changedSprites = await project.getSprites(),
    editorSprites = [...sprites.sprites.select().children] as HTMLElement[],
    loadedJSON = JSON.parse(window.vm.toJSON());

  editorSprites.forEach((sprite) => {
    let divs = sprite
      .querySelector("div")!
      .querySelectorAll("div") as NodeListOf<HTMLDivElement>;
    let spriteName = divs[2].innerText;

    sprite.addEventListener("click", () => {
      if (
        sprites.selectedSprite.select() &&
        spriteName ===
          nameOfSprite(sprites.selectedSprite.select() as HTMLDivElement) &&
        sprite.querySelector<HTMLDivElement>(".diff-button")?.style
          .marginTop === "30px"
      ) {
        return;
      }

      (<HTMLDivElement[]>[...sprites.spriteSelDelete.selectAll(sprites.delete)])
        .filter((button) => !button.classList.contains("stage-diff-button"))
        .forEach((button) => (button.style.marginTop = "0px"));
    });

    // builds a sprite diff button
    if (!changedSprites.some((e) => e.name === spriteName && !e.isStage))
      return;

    let diffButton = SpriteDiff({
      style: `
      margin-top: ${sprites.delete.select() !== null ? "30px" : "0px"};
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
        (
          document.querySelector("dialog[is='diff-modal']") as DiffModal
        ).display(project, spriteName);
      },
    });

    divs[3].after(diffButton);

    // on sprite click, adjust diff buttons location and highlight changed scripts
    sprite.addEventListener("click", async () => {
      let movedToSprite = nameOfSprite(
        await new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            resolve(sprites.selectedSprite.select() as HTMLDivElement);
          });
          observer.observe(sprites.selectedSprite.select() ?? document.body, {
            childList: true,
            subtree: true,
          });
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
  let stageWrapper = sprites.stageWrapper.select() as HTMLDivElement;

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
          .display(project, "Stage (stage)");
      },
    });

    stageWrapper.querySelector("img")!.after(stageDiffButton);
  }

  // when opening the stage, move all the diff buttons up
  stageWrapper.addEventListener("click", async () => {
    (<HTMLDivElement[]>[...sprites.spriteSelDelete.selectAll("sprites.delete")])
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));

    await highlightChanged(project, STAGE, loadedJSON);
  });

  let selectedSprite = sprites.selectedSprite.select() as HTMLDivElement;

  let sprite = (
    selectedSprite
      ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
      : STAGE
  ) satisfies Sprite;

  await highlightChanged(project, sprite, loadedJSON);

  // retain diff highlights when switching between editor tabs
  new MutationObserver(async ([mutation, _]) => {
    if ((mutation.target as HTMLElement).classList.contains(misc.selectedTab)) {
      let selectedSprite = sprites.selectedSprite.select() as HTMLDivElement;
      let sprite_ = selectedSprite
        ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
        : STAGE;
      await highlightChanged(project, sprite_, loadedJSON);
    }
  }).observe(document.querySelector("#react-tabs-0")!, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // retain diff highlights for when editor theme
  new MutationObserver(async () => {
    let selectedSprite = sprites.selectedSprite.select() as HTMLDivElement;
    let sprite_ = selectedSprite
      ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
      : STAGE;
    await highlightChanged(project, sprite_, loadedJSON);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
}
