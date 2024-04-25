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

  let scripts = parseScripts(
    await project.getPreviousScripts(spriteName),
    await project.getCurrentScripts(spriteName)
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

function applyDiffFilter() {
  if (document.querySelector("filter#blocklyStackDiffFilter")) return;

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
  (window as any).changedScripts = changedScripts;
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
  let sprites = <HTMLElement[]>[
    ...document.querySelector(`.${Cmp.SPRITES}`)!.children,
  ];
  let loadedJSON = JSON.parse(window.vm.toJSON());

  sprites.forEach((sprite) => {
    let divs = sprite
      .querySelector("div")!
      .querySelectorAll("div") as NodeListOf<HTMLDivElement>;
    let spriteName = divs[2].innerText;

    sprite.addEventListener("click", () => {
      if (
        document.querySelector(`.${Cmp.SELECTED_SPRITE}`) &&
        spriteName ===
          nameOfSprite(document.querySelector(`.${Cmp.SELECTED_SPRITE}`)!) &&
        sprite.querySelector<HTMLDivElement>(".diff-button")?.style
          .marginTop === "30px"
      ) {
        return;
      }

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
      const changedSprite: HTMLDivElement = await new Promise((resolve) => {
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

  // let pick =  document.querySelector(`.${Cmp.SELECTED_SPRITE}`) ? (e) =>
  // e[0] === nameOfSprite(document.querySelector(`.${Cmp.SELECTED_SPRITE}`)!) :

  let selectedSprite: HTMLDivElement = document.querySelector(
    `.${Cmp.SELECTED_SPRITE}`
  )!;
  let sprite = (
    selectedSprite
      ? changedSprites.find((e) => e[0] === nameOfSprite(selectedSprite))
      : ["Stage", true]
  )!;

  await highlightChanged(project, sprite, loadedJSON);

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
    await highlightChanged(project, ["Stage", true], loadedJSON);
  };
}
