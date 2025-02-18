import van from "vanjs-core";

import api, { CostumeChange, Project } from "@/api";
import { cls, Settings, Checkbox, Copy } from "@/components";
import { getBlockly, Redux, scratchblocks, vm } from "@/lib";
import { parseScripts } from "@/diff-indicators";
import { userSettings } from "@/settings";
import { ProjectJSON } from "@/diff-indicators/script-parser";

import { Card } from "../card";
import { scrollBlockIntoView, flash } from "./block-utils";
import { imageLayer, unifiedDiff, toDataURI } from "./image-utils";
import iconCodeSvg from "./code.svg";
import iconCostumesSvg from "./paintbrush.svg";
import iconSoundsSvg from "./sound.svg";
import { Base } from "../base";
import { Diff } from ".";
import { createSprite, Revert } from "./revert-ui";

// this code makes me sick and refactoring would be so great

const { div, span, ul, button, p, pre, aside, main, br, i, li, img, audio } =
  van.tags;

const DIFF_ICON = {
  added: "fa-solid fa-square-plus",
  removed: "fa-solid fa-square-xmark",
  modified: "fa-solid fa-square-minus",
};

/** Dark mode block fill colors that TurboWarp use */
const DARK_BLOCKS = {
  "sb3-motion": "#0F1E33",
  "sb3-looks": "#1E1433",
  "sb3-sound": "#291329",
  "sb3-events": "#332600",
  "sb3-control": "#332205",
  "sb3-sensing": "#12232A",
  "sb3-operators": "#112611",
  "sb3-variables": "#331C05",
  "sb3-list": "#331405",
  "sb3-custom": "#331419",
  "sb3-extension": "#03251C",
};

const locale = Redux.getState().locales.locale;

const byteFormatter = Intl.NumberFormat(locale, {
  notation: "compact",
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
});

const percentFormatter = Intl.NumberFormat(locale, {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends Base {
  private $scripts!: HTMLUListElement;
  private $commits!: HTMLParagraphElement;
  private $highlights!: HTMLInputElement;
  private $plainText!: HTMLInputElement;
  private $unified!: HTMLElement;
  private $revert!: HTMLButtonElement;
  private $revertList!: HTMLElement;

  private previousScripts!: ProjectJSON;
  private currentScripts!: ProjectJSON;
  private costumeChanges!: Record<string, Record<string, CostumeChange[]>>;

  private copyCallback!: () => string | SVGElement;

  private unify = van.state(true);
  private reverting = false;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();
    this.style.position = "absolute";
    this.style.zIndex = "1000";

    this.copyCallback = () =>
      (this.querySelector(".scratchblocks svg") as SVGElement) ??
      (this.querySelector(".commit-wrap") as HTMLElement)?.innerText;

    const useHighlights = Checkbox({}, "Use highlights");
    const plainText = Checkbox({ style: "margin-left: 10px;" }, "Plain text");
    const unified = span(
      { style: "margin-left: -15px" },
      button(
        {
          onclick: () => (this.unify.val = false),
          class: cls(Settings.button, "round-right-button"),
          style: () =>
            this.unify.val
              ? "filter: brightness(0.88); padding: 0.3rem"
              : "padding: 0.3rem",
        },
        "Split"
      ),
      button(
        {
          onclick: () => (this.unify.val = true),
          class: cls(Settings.button, "round-left-button"),
          style: () =>
            !this.unify.val
              ? "filter: brightness(0.88); padding: 0.3rem"
              : "padding: 0.3rem",
        },
        "Unified"
      )
    );
    const importOld = button(
      {
        class: Settings.button,
        style: "margin-left: 15px; padding: 0.3rem",
      },
      i({ class: "fa-solid fa-rotate-left" }),
      " Revert sprite"
    );

    const header = p(
      { style: "margin-right: 10px; margin-left: 10px", id: "diff-header" },
      span(
        {
          class: "header",
        },
        span(
          { class: "Settings-group", style: "width: 100%" },
          useHighlights,
          plainText,
          unified,
          Copy(this.copyCallback, {
            class: cls("copy-button", Settings.button),
            style: "padding: 0.3rem 10px",
          })
        )
      )
    );

    const diff = div(
      { class: "commit-view" },
      pre(
        { class: "commit-wrap", style: "display: inline-block" },
        pre({ class: "real-commit-wrap" })
      )
    );

    const revertList = main({ class: "revert-list", style: "display: none" });

    this.$scripts = ul();
    this.$highlights = useHighlights.querySelector("input")!;
    this.$plainText = plainText.querySelector("input")!;
    this.$commits = diff.querySelector(".real-commit-wrap")!;
    this.$unified = unified;
    this.$revert = importOld;
    this.$revertList = revertList;

    van.add(
      this,
      Card(
        main(
          { class: "diff-view" },
          aside(importOld, this.$scripts),
          revertList,
          main(div({ class: "content" }, header), diff)
        ),
        "Diff",
        () => this.close()
      )
    );
  }

  /** Highlights diffs as blocks */
  private highlightAsBlocks() {
    const svg = this.querySelectorAll(".scratchblocks svg > g");

    svg.forEach((blocks) => {
      blocks.querySelectorAll("path.sb3-diff").forEach((diff) => {
        const moddedBlock = diff.previousElementSibling!.cloneNode(
          true
        ) as SVGElement;
        const fillColor = diff.classList.contains("sb3-diff-ins")
          ? "green"
          : diff.classList.contains("sb3-diff-del")
            ? "red"
            : "grey";
        moddedBlock
          .querySelectorAll<SVGPathElement | SVGGElement | SVGRectElement>(
            "path,g,rect"
          ) // g selector isn't needed maybe but just in case..
          .forEach((element) => {
            element.style.cssText = `fill: ${fillColor}; opacity: 0.5`;
          });
        diff.previousElementSibling!.after(moddedBlock);
        diff.remove();
      });
    });

    this.copyCallback = () =>
      this.querySelector(".scratchblocks svg") as SVGElement;
  }

  /** Highlights diffs with plain text */
  private highlightAsText(diff: Diff) {
    const { $commits, $highlights } = this;
    const content = diff.diffed.trimStart() ?? "";

    $commits.innerHTML = `<pre>${content}</pre><br>`;

    if ($highlights.checked) {
      let highlights = content.split("\n").map((e, i) =>
        span(
          {
            style: `background-color: rgba(${e.startsWith("-")
                ? "255,0,0,0.5"
                : e.startsWith("+")
                  ? "0,255,0,0.5"
                  : "0,0,0,0"
              })`,
          },
          i == 0 ? e.trimStart() : e
        )
      );
      if (highlights[0].innerText === "") {
        highlights = highlights.slice(1);
      }
      $commits.innerHTML = "";
      $commits.append(
        pre(
          // @ts-expect-error - not sure
          highlights.reduce((x, y) => (x === null ? [y] : [x, br(), y]), null)
        )
      );
    }

    this.copyCallback = () => content;
  }

  /** Sets theme of diff viewer */
  private setDiffTheme(theme: "dark" | "light") {
    const svg = this.querySelectorAll(".scratchblocks svg > g");
    if (theme === "dark") {
      svg.forEach((blocks) => {
        blocks
          .querySelectorAll<SVGPathElement>("path.sb3-diff")
          .forEach(
            (diff) =>
              (diff.style.cssText = "stroke: white; stroke-width: 3.5px")
          );
      });
    } else {
      svg.forEach((blocks) => {
        blocks
          .querySelectorAll<SVGPathElement>("path.sb3-diff")
          .forEach((diff) => (diff.style.cssText = ""));
      });
    }
  }

  private UnifyToggle(
    a: { contents: string; size: number },
    b: { contents: string; size: number },
    unified: HTMLCanvasElement
  ) {
    const sizeChange = `${byteFormatter.format(b.size)}${a.size === 0
        ? " "
        : " (" +
        percentFormatter.format((b.size - a.size) / Math.abs(a.size)) +
        ")"
      }`;

    const aImage = img({ src: a.contents }),
      bImage = img({ src: b.contents });

    return span(
      {
        style: 'font-family: "Helvetica Neue", Helvetica, Arial, sans-serif',
      },
      () =>
        !this.unify.val
          ? span(
            { style: "display: flex; align-items: center; gap: 10px" },
            span(
              {
                class: "image costume-diff-canvas",
                style: "border: 2px solid red",
              },
              a.contents !== "" ? Copy(() => aImage) : undefined,
              img({
                src: a.contents,
                height: aImage.height / 2,
                width: aImage.width / 2,
              }),
              byteFormatter.format(a.size)
            ),
            i({ class: "fa-solid fa-arrow-right fa-xl" }),
            span(
              {
                class: "image costume-diff-canvas",
                style: "border: 2px solid green",
              },
              b.contents !== "" ? Copy(() => bImage) : undefined,
              img({
                src: b.contents,
                height: bImage.height / 2,
                width: bImage.width / 2,
              }),
              sizeChange
            )
          )
          : span(
            {
              class: "image costume-diff-canvas",
              style: "border: 2px solid grey",
            },
            Copy(() => img({ src: unified.toDataURL() })),
            unified,
            span(
              { style: "text-align: right" },
              byteFormatter.format(a.size),
              " ",
              i({ class: "fa-solid fa-arrow-right" }),
              " ",
              sizeChange
            )
          )
    );
  }

  public async display(
    project: Project | undefined,
    spriteName: string,
    script: number = 0,
    cached = false
  ) {
    const {
      $commits,
      $highlights,
      $plainText,
      $scripts,
      $unified,
      $revert,
      $revertList,
    } = this;

    // try again in case of undefined
    project ??= api.getCurrentProject()!;

    let oldScripts: ProjectJSON, newScripts: ProjectJSON;

    if (
      !cached ||
      !this.previousScripts ||
      !this.currentScripts ||
      !this.costumeChanges
    ) {
      this.previousScripts = await project.getPreviousScripts(spriteName);
      this.currentScripts = await project.getCurrentScripts(spriteName);
      this.costumeChanges = await project.getChangedAssets();
    }

    oldScripts = this.previousScripts;
    newScripts = this.currentScripts;

    const diffs = await parseScripts(
      project.projectName,
      oldScripts,
      newScripts
    );

    const costumeDiffs = this.costumeChanges[spriteName];
    const { blocks: blockTheme, gui: uiTheme } = (
      Redux.getState().scratchGui as any
    ).theme.theme;

    const config = {
      style:
        blockTheme === "high-contrast" ? "scratch3-high-contrast" : "scratch3",
      scale: 0.675,
    };

    const diffBlocks = () => {
      scratchblocks.renderMatching(".real-commit-wrap", config);

      const svg = this.querySelector(".scratchblocks svg > g")!;

      // darken blocks to match tw dark theme
      if (blockTheme === "dark") {
        svg.querySelectorAll(":scope > g").forEach((blocks) => {
          blocks
            .querySelectorAll<SVGPathElement | SVGRectElement>("path, rect")
            .forEach((element) => {
              const darkFill =
                DARK_BLOCKS[
                element.classList.item(0) as keyof typeof DARK_BLOCKS
                ];
              if (darkFill) {
                element.style.fill = darkFill;
              }
            });
          blocks
            .querySelectorAll<SVGPathElement | SVGRectElement>("path, rect")
            .forEach((element) => {
              const darkFill =
                DARK_BLOCKS[
                element.classList.item(0) as keyof typeof DARK_BLOCKS
                ];
              if (darkFill) {
                element.style.fill = darkFill;
              }
            });
        });
        svg
          .querySelectorAll<SVGRectElement>("rect.sb3-input")
          .forEach((input) => {
            input.style.fill = "rgb(76, 76, 76)";
          });
        svg
          .querySelectorAll<SVGTextElement>("text.sb3-label")
          .forEach((input) => {
            input.style.fill = "#fff";
          });
        return;
      }

      // adjust dropdown inputs to match tw
      const dropdownChange = {
        three: "brightness(0.83)",
        "high-contrast": "brightness(1.12) saturate(0.7)",
      }[blockTheme as string];
      if (dropdownChange !== undefined) {
        svg
          .querySelectorAll<SVGRectElement>("rect.sb3-input-dropdown")
          .forEach((input) => {
            input.style.filter = dropdownChange;
          });
      }
    };

    $scripts.innerHTML = "";
    $commits.innerText = diffs[script]?.diffed ?? "";
    diffBlocks();

    $highlights.onchange = () => {
      userSettings.highlights = $highlights.checked;
      if ($highlights.checked) {
        this.highlightAsBlocks();
        if ($plainText.checked) {
          this.highlightAsText(diffs[script]);
        }
      } else {
        if ($plainText.checked) {
          const content = diffs[script].diffed ?? "";
          $commits.innerHTML = "";
          $commits.append(pre(content.trimStart()));
        } else {
          $commits.innerText = diffs[script].diffed ?? "";
          diffBlocks();
        }
      }
      this.setDiffTheme(uiTheme);
    };

    $plainText.onchange = (e) => {
      userSettings.plainText = $plainText.checked;
      if ($plainText.checked) {
        if ($highlights.checked) {
          this.highlightAsText(diffs[script]);
        } else {
          const content = diffs[script].diffed ?? "";
          $commits.innerHTML = "";
          $commits.append(pre(content.trimStart()));
        }
      } else {
        if (e.type !== "init") {
          diffBlocks();
          if ($highlights.checked) this.highlightAsBlocks();
        }
      }
      $commits.style.userSelect = $plainText.checked ? "text" : "none";
      this.setDiffTheme(uiTheme);
    };

    // assign diff displaying to diffs
    diffs.forEach((diff, scriptNo) => {
      let labelText;
      if (window._changedScripts[spriteName])
        labelText = getBlockly()
          .getBlockById(window._changedScripts[spriteName][scriptNo])
          ?.comment?.getLabelText();
      const diffButton = li(
        button(
          { class: "tab-btn" },
          span(
            { style: "display: flex; align-items: center: gap: 5px" },
            i({ class: `${DIFF_ICON[diff.status]} change-icon` }),
            span({ style: "padding-right: 10px" }, iconCodeSvg())
          ),
          labelText ?? diff.scriptNo,
          diff.status === "modified" || diff.status === "added"
            ? button(
              {
                class: `${Settings.button} open-script`,
                onclick: (e: Event) => {
                  e.stopPropagation();
                  this.style.opacity = "0.5";
                  // switch to editor tab to flash script if not there
                  if (
                    Redux.getState().scratchGui.editorTab.activeTabIndex !== 0
                  ) {
                    Redux.dispatch({
                      type: "scratch-gui/navigation/ACTIVATE_TAB",
                      activeTabIndex: 0,
                    });
                  }
                  const id = window._changedScripts[spriteName][scriptNo];
                  scrollBlockIntoView(id);
                  flash(getBlockly().getBlockById(id)).then(() => {
                    const listener = () => (this.style.opacity = "1");
                    document.addEventListener("mousemove", () => {
                      listener();
                      document.removeEventListener("mousemove", listener);
                    });
                  });
                },
              },
              i({ class: "fa-solid fa-up-right-from-square" })
            )
            : undefined
        )
      );

      const btnRef = diffButton.querySelector("button")!;
      btnRef.setAttribute("script-no", scriptNo.toString());
      btnRef.setAttribute("diff-type", "script");

      if (scriptNo !== script) {
        diffButton.onclick = async () => {
          document
            .querySelectorAll(".tab-btn")
            .forEach((e) => e.classList.remove("active-tab"));
          diffButton.querySelector("button")!.classList.add("active-tab");
          await this.display(
            project,
            spriteName,
            parseInt(
              this.querySelector("button.active-tab")!.getAttribute(
                "script-no"
              )!
            ),
            true
          );
        };
      }

      $scripts.appendChild(diffButton);
    });

    let lastScriptNo = diffs.length === 0 ? 0 : diffs.length;

    if (costumeDiffs) {
      for (const [_costNo, assetName] of Object.keys(costumeDiffs).entries()) {
        const costNo = lastScriptNo + _costNo;
        const diff = costumeDiffs[assetName];
        const isSoundDiff = diff.some(
          (e) => e?.ext === "wav" || e?.ext === "mp3"
        );

        const status =
          diff[0] && diff[1]
            ? "modified"
            : diff[0]?.kind === "after" && !diff[1]
              ? "added"
              : "removed";

        const diffButton = li(
          button(
            { class: "tab-btn" },
            span(
              { style: "display: flex; align-items: center; gap: 5px" },
              i({ class: `${DIFF_ICON[status]} change-icon` }),
              span(
                { style: "padding-right: 10px" },
                isSoundDiff ? iconSoundsSvg() : iconCostumesSvg()
              )
            ),
            assetName
          )
        );

        const btnRef = diffButton.querySelector("button")!;
        btnRef.setAttribute("script-no", costNo.toString());
        btnRef.setAttribute("diff-type", isSoundDiff ? "sound" : "costume");
        btnRef.setAttribute("asset-name", assetName);

        if (costNo !== script) {
          diffButton.onclick = async () => {
            document
              .querySelectorAll(".tab-btn")
              .forEach((e) => e.classList.remove("active-tab"));
            diffButton.querySelector("button")!.classList.add("active-tab");
            await this.display(
              project,
              spriteName,
              parseInt(
                this.querySelector("button.active-tab")!.getAttribute(
                  "script-no"
                )!
              ),
              true
            );
          };
        }

        $scripts.appendChild(diffButton);
      };
    }

    const btnRef = this.querySelector(`button[script-no="${script}"]`)!;

    btnRef.classList.add("active-tab");
    const scriptDiff = btnRef.getAttribute("diff-type");

    // costume diff view
    const display = scriptDiff === "script" ? "flex" : "none";
    document.querySelector<HTMLDivElement>(".copy-button")!.style.display =
      scriptDiff === "script" ? "block" : "none";
    $plainText.parentElement!.style.display = display;
    $highlights.parentElement!.style.display = display;
    $unified.style.display = scriptDiff === "costume" ? "block" : "none";

    if (scriptDiff !== "script") {
      document.querySelector(".scratchblocks")!.remove();
      const [current, previous] =
        costumeDiffs[btnRef.getAttribute("asset-name")!];
      const isSoundDiff = btnRef.getAttribute("diff-type") === "sound";

      let previousAsset = { contents: "", size: 0 };
      let currentAsset = { contents: "", size: 0 };
      if (current && previous) {
        previousAsset = {
          contents: toDataURI(
            previous.path.split(".").pop()!,
            String.fromCharCode.apply(null, previous.contents)
          ),
          size: previous.contents.length,
        };
        currentAsset = {
          contents: toDataURI(
            current.path.split(".").pop()!,
            String.fromCharCode.apply(null, current.contents)
          ),
          size: current.contents.length,
        };
      } else {
        if (current && !previous && current.kind !== "before") {
          currentAsset = {
            contents: toDataURI(
              current.path.split(".").pop()!,
              String.fromCharCode.apply(null, current.contents)
            ),
            size: current.contents.length,
          };
        } else if (current.kind === "before" && !previous) {
          previousAsset = {
            contents: toDataURI(
              current.path.split(".").pop()!,
              String.fromCharCode.apply(null, current.contents)
            ),
            size: current.contents.length,
          };
        }
      }

      const _previousAssetImg = img({ src: previousAsset.contents }),
        _currentAssetImg = img({ src: currentAsset.contents });
      const previousAssetImg = imageLayer(
        img({
          src: previousAsset.contents,
          width: _previousAssetImg.width / 2,
          height: _previousAssetImg.height / 2,
        }),
        userSettings.imgRmColor
      ),
        currentAssetImg = imageLayer(
          img({
            src: currentAsset.contents,
            width: _currentAssetImg.width / 2,
            height: _currentAssetImg.height / 2,
          }),
          userSettings.imgAddColor
        );

      let imageDiff;
      try {
        imageDiff = unifiedDiff(previousAssetImg, currentAssetImg);
      } catch {
        this.unify.val = false;
      }

      $commits.appendChild(
        span(
          { class: "costume-diff" },
          isSoundDiff
            ? audio({ src: previousAsset.contents, controls: true })
            : this.UnifyToggle(previousAsset, currentAsset, imageDiff!),
          ...(isSoundDiff
            ? [
              i({ class: "fa-solid fa-arrow-right fa-xl" }),
              audio({ src: currentAsset.contents, controls: true }),
            ]
            : [undefined])
        )
      );
    }

    this.setDiffTheme(uiTheme);

    if (scriptDiff === "script") {
      $plainText.onchange(new Event("init"));
      $highlights.onchange(new Event("init"));
    }

    this.querySelector(".commit-wrap")?.classList.toggle(
      "costume-diff-wrap",
      scriptDiff === "costume"
    );

    $highlights.checked = userSettings.highlights;
    $plainText.checked = userSettings.plainText;

    if (scriptDiff === "script") {
      const currentSprite = vm.runtime._editingTarget!;

      $revert.classList.remove(Settings.disabledButton);
      $revert.disabled = false;
      $revert.onclick = () => {
        if (!this.reverting) {
          $revertList.style.display = "flex";
          $revertList.innerHTML = "";
          $revert.innerHTML = "Cancel revert";

          $revertList.append(
            Revert({
              diffs,
              onsubmit: (e) => {
                let target = e.target! as HTMLElement;

                if (
                  e.shiftKey &&
                  confirm(
                    "You are going to replace the original sprite by reverting these changes. Are you sure you want to do this?"
                  )
                ) {
                  vm.deleteSprite(
                    vm.runtime.getSpriteTargetByName(currentSprite.sprite.name)!
                      .id
                  );
                }

                let checkboxes = (
                  [
                    ...target.parentElement!.querySelectorAll(
                      "input[type=checkbox]"
                    ),
                  ] as HTMLInputElement[]
                )
                  .map((e) => {
                    const name = e.getAttribute("name");
                    return name ? [name, e.checked] : null;
                  })
                  .filter((e) => e !== null)
                  .map(([name, checked]) => [
                    parseInt(name as string),
                    checked,
                  ]);

                const selections = Object.assign(
                  {},
                  ...checkboxes.map(([id, checked]) => {
                    const diff = diffs[id as number];
                    const stack = (checked ? diff.json : diff.oldJSON).getStack(
                      checked ? diff.script : diff.oldScript
                    );
                    return stack;
                  })
                );

                if (e.shiftKey) {
                  Object.keys(oldScripts.json)
                    .filter((e) => !Object.keys(selections).includes(e))
                    .map((e) => [e, oldScripts.json[e]])
                    .forEach(([key, obj]) => (selections[key] = obj));
                }

                const name = `${currentSprite.sprite.name} [↩]`;

                vm.addSprite(
                  createSprite(
                    e.shiftKey ? currentSprite.sprite.name : name,
                    selections
                  )
                );
                this.close();
              },
            })
          );
        } else {
          $revertList.style.display = "none";
          $revert.innerHTML = "";
          $revert.append(
            i({ class: "fa-solid fa-rotate-left" }),
            " Revert sprite"
          );
        }
        this.reverting = !this.reverting;
      };
    } else {
      $revert.classList.add(Settings.disabledButton);
      $revert.disabled = true;
      $revert.onclick = () => { };
    }

    this.querySelector<HTMLElement>(".card-title")!.innerText = spriteName;

    this.close();
    this.showModal();
  }

  close() {
    this.style.display = "none";
    if (this.$revertList) {
      this.$revertList.style.display = "none";
      this.reverting = false;
      this.$revert.innerHTML = "";
      this.$revert.append(
        i({ class: "fa-solid fa-rotate-left" }),
        " Revert sprite"
      );
    }
  }
}
