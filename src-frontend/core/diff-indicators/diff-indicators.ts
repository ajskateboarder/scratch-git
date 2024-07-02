/** @file Displays indicators and info on sprites that were changed */
import type { Project, Sprite } from "../api";
import { s, sprites } from "../components";
import type { DiffModal } from "../modals";
import { parseScripts } from "./script-parser";
import { SpriteDiff, StageDiff } from "../components";
import { getBlockly } from "../../lib/globals";
import { userSettings } from "../settings";

const STAGE = {
  name: "Stage",
  isStage: true,
  format: () => "Stage (stage)",
} satisfies Sprite;

/** Receive Blockly IDs to top-level blocks that were changed
 *
 * @param project - the project to retreieve changed scripts
 * @param sprite - the {@link Sprite} in which blocks were changed
 * @param loadedJSON - the current JSON loaded in the editor (fetched through vm)
 */
const changedBlocklyScripts = async (
  projectName: string,
  sprite: Sprite,
  loadedJSON: any,
  previousScripts: any,
  currentScripts: any
) => {
  if (sprite === undefined) {
    console.warn("provided sprite for diffing was undefined");
    return;
  }

  const topLevels = () => {
    const target = loadedJSON.targets.find((e: any) =>
      spriteName.includes("(stage)") ? e.isStage : e.name === spriteName
    );

    return Object.keys(target.blocks).filter(
      (k) => target.blocks[k].parent === null
    );
  };

  const spriteName: string = sprite.format();
  const workspace = getBlockly();

  const diffs = await parseScripts(
    projectName,
    previousScripts,
    currentScripts
  );

  return diffs
    .map((e) => workspace.topBlocks_[topLevels().indexOf(e.script)]?.id)
    .filter((e) => e !== undefined);
};

const highlightChanged = async (
  project: Project,
  sprite: Sprite | undefined,
  loadedJSON: any
) => {
  // diff highlight filter for scripts
  document.querySelector("filter#blocklyStackDiffFilter")?.remove();
  document.querySelector(
    ".blocklySvg defs"
  )!.innerHTML += `<filter id="blocklyStackDiffFilter" height="160%" width="180%" y="-30%" x="-40%">
    <feGaussianBlur in="SourceGraphic" stdDeviation="4"></feGaussianBlur>
    <feComponentTransfer result="outBlur">
      <feFuncA type="table" tableValues="0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1"></feFuncA>
    </feComponentTransfer>
    <feFlood flood-color="${userSettings.scriptColor}" flood-opacity="1" result="outColor"></feFlood>
    <feComposite in="outColor" in2="outBlur" operator="in" result="outGlow"></feComposite>
    <feComposite in="SourceGraphic" in2="outGlow" operator="over"></feComposite>
  </filter>`;

  document
    .querySelectorAll<HTMLElement>(`g[was-changed="true"]`)
    .forEach((e) => (e.style.filter = ""));

  if (sprite === undefined) {
    throw new Error("No sprite was changed");
  }

  const previousScripts = await project.getPreviousScripts(sprite.format());
  const currentScripts = await project.getCurrentScripts(sprite.format());

  let changedScripts = await changedBlocklyScripts(
    project.projectName,
    sprite,
    loadedJSON,
    previousScripts,
    currentScripts
  );

  console.debug(
    `received following for sprite ${sprite.format()}`,
    changedScripts
  );

  if (changedScripts === undefined || changedScripts.length === 0) {
    // fallback onto cache if fetching changed scripts fails
    changedScripts = window._changedScripts[sprite.format()];
    // if nothing was actually changed just forget it
    if (changedScripts === undefined || changedScripts.length === 0) return;
  }

  // persist this until the next save
  window._changedScripts[sprite.format()] = changedScripts;

  changedScripts.forEach((e) => {
    const group = getBlockly().getBlockById(e).svgGroup_;
    group.style.filter = "url(#blocklyStackDiffFilter)";
    group.setAttribute("was-changed", "true");
  });
};

const nameOfSprite = (element: HTMLElement) =>
  element.querySelectorAll("div")[2].innerText;

/** Shows buttons to display changes and highlight changed scripts
 *
 * @param project - the currently open project
 */
export const showIndicators = async (project: Project) => {
  const changedSprites = await project.getChangedSprites(),
    editorSprites = [
      ...s("sprite-selector_items-wrapper").select().children,
    ] as HTMLElement[],
    loadedJSON = JSON.parse(window.vm.toJSON());

  editorSprites.forEach((sprite) => {
    const divs = sprite
      .querySelector("div")!
      .querySelectorAll("div") as NodeListOf<HTMLDivElement>;
    const spriteName = divs[2].innerText;

    sprite.addEventListener("click", () => {
      if (
        sprites.selectedSprite.select() &&
        spriteName === nameOfSprite(sprites.selectedSprite.select()) &&
        sprite.querySelector<HTMLDivElement>(".diff-button")?.style
          .marginTop === "30px"
      ) {
        return;
      }

      sprites.spriteSelDelete
        .selectAll<HTMLDivElement>(sprites.delete)
        .filter((button) => !button.classList.contains("stage-diff-button"))
        .forEach((button) => (button.style.marginTop = "0px"));
    });

    // builds a sprite diff button
    if (!changedSprites.some((e) => e.name === spriteName && !e.isStage))
      return;

    const diffButton = SpriteDiff({
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
      const movedToSprite = nameOfSprite(
        await new Promise((resolve) => {
          const observer = new MutationObserver(() => {
            resolve(sprites.selectedSprite.select<HTMLDivElement>());
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
  const stageWrapper = sprites.stageWrapper.select();

  if (changedSprites.some((e) => e.name === "Stage" && e.isStage)) {
    const stageDiffButton = StageDiff({
      class: "stage-diff",
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
    sprites.spriteSelDelete
      .selectAll<HTMLDivElement>()
      .filter((button) => !button.classList.contains("stage-diff-button"))
      .forEach((button) => (button.style.marginTop = "0px"));

    await highlightChanged(project, STAGE, loadedJSON);
  });

  // if the user is in costumes/sounds, there may be >1 "selected sprites"
  const spriteSels = sprites.selectedSprite.selectAll<HTMLDivElement>();
  const selectedSprite =
    spriteSels.length > 1 ? spriteSels[spriteSels.length - 1] : spriteSels[0];

  const sprite = selectedSprite
    ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
    : STAGE;

  await highlightChanged(project, sprite, loadedJSON);

  // retain diff highlights when switching between editor tabs
  new MutationObserver(async ([mutation, _]) => {
    if (
      (mutation.target as HTMLElement).classList.contains(
        s("react-tabs_react-tabs__tab--selected")
      )
    ) {
      const selectedSprite = sprites.selectedSprite.select<HTMLDivElement>();
      const sprite_ = selectedSprite
        ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
        : STAGE;
      await highlightChanged(project, sprite_, loadedJSON);
    }
  }).observe(s("react-tabs_react-tabs__tab-list").select().firstChild!, {
    attributes: true,
    attributeFilter: ["class"],
  });

  // retain diff highlights for when editor theme
  new MutationObserver(async () => {
    const selectedSprite = sprites.selectedSprite.select<HTMLDivElement>();
    const sprite_ = selectedSprite
      ? changedSprites.find((e) => e.name === nameOfSprite(selectedSprite))!
      : STAGE;
    await highlightChanged(project, sprite_, loadedJSON);
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["style"],
  });
};
