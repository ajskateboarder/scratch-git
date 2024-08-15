import { scrollBlockIntoView, flash } from "./block-utils";
import api, { CostumeChange, Project } from "@/api";
import { Card, cls, settings } from "@/components";
import { Checkbox, Copy } from "@/components";
import { Redux, scratchblocks } from "@/lib";
import { getBlockly } from "@/lib";
import { parseScripts, type ScriptStatus } from "@/diff-indicators";
import { userSettings } from "@/settings";
import van from "vanjs-core";

import iconCodeSvg from "./icon--code.svg";
import iconCostumesSvg from "./icon--costumes.svg";
import iconSoundsSvg from "./icon--sounds.svg";
import { imageLayer, unifiedDiff, toDataURI } from "./image-utils";
import { getLocale } from "@/l10n";

const {
  div,
  span,
  ul,
  button,
  p,
  pre,
  aside,
  main,
  br,
  i,
  li,
  img,
  audio,
  details,
  summary,
} = van.tags;

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

interface Diff {
  oldContent: any;
  newContent: any;
  status: ScriptStatus;
  scriptNo: number | any[];
  script: string;
  added: number;
  removed: number;
  diffed: string;
}

const byteFormatter = Intl.NumberFormat(getLocale(), {
  notation: "compact",
  style: "unit",
  unit: "byte",
  unitDisplay: "narrow",
});

const percentFormatter = Intl.NumberFormat(getLocale(), {
  style: "percent",
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
});

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends HTMLElement {
  $scripts!: HTMLUListElement;
  $commits!: HTMLParagraphElement;
  $highlights!: HTMLInputElement;
  $plainText!: HTMLInputElement;
  $unified!: HTMLElement;

  previousScripts: any;
  currentScripts: any;
  costumeChanges!: Record<string, Record<string, CostumeChange[]>>;

  private copyCallback!: () => string | SVGElement;
  unify = van.state(true);

  constructor() {
    super();
  }

  // placeholders so i don't have to change a lot of code
  // TODO: don't
  close() {
    this.style.display = "none";
  }
  showModal() {
    this.style.display = "flex";
  }
  refresh() {
    this.querySelector("main")?.remove();
    this.connectedCallback();
  }

  get open() {
    return this.style.display !== "none";
  }

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();

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
          class: cls(settings.button, "round-right-button"),
          style: () => (this.unify.val ? "filter: brightness(0.88)" : ""),
        },
        "Split"
      ),
      button(
        {
          onclick: () => (this.unify.val = true),
          class: cls(settings.button, "round-left-button"),
          style: () => (!this.unify.val ? "filter: brightness(0.88)" : ""),
        },
        "Unified"
      )
    );

    const commits = p(
      { style: "margin-right: 10px; margin-left: 10px", id: "commits" },
      span(
        {
          class: "header",
        },
        span({ class: "settings-group" }, useHighlights, plainText, unified)
      ),
      div(
        { class: "commit-view" },
        pre(
          { class: "commit-wrap" },
          Copy(this.copyCallback),
          pre({ class: "real-commit-wrap" })
        )
      )
    );

    Object.assign(this, {
      $scripts: ul({ style: "max-width: 200px" }),
      $highlights: useHighlights.querySelector("input")!,
      $plainText: plainText.querySelector("input")!,
      $commits: commits.querySelector(".real-commit-wrap")!,
      $unified: unified,
    });

    van.add(
      this,
      Card(
        main(
          { class: "diff-view" },
          aside(this.$scripts),
          main(div({ class: "content" }, commits))
        ),
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

  /** Highlights diffs with plain text
   *
   * @param diffs - b
   * @param script -
   */
  private highlightAsText(diffs: Diff[], script: number) {
    const { $commits, $highlights } = this;

    // TODO: passing in diffs and script idx is probably unneeded
    const content = diffs[script].diffed.trimStart() ?? "";

    $commits.innerHTML = `<pre>${content}</pre><br>`;

    if ($highlights.checked) {
      let highlights = content.split("\n").map((e, i) =>
        span(
          {
            style: `background-color: rgba(${
              e.startsWith("-")
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
    const sizeChange = `${byteFormatter.format(b.size)}${
      a.size === 0
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
                Copy(() => aImage),
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
                Copy(() => bImage),
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
    script = 0,
    cached = false
  ) {
    const { $commits, $highlights, $plainText, $scripts, $unified } = this;

    // try again in case of undefined
    if (!project) project = api.getCurrentProject();
    project = project!;

    let oldScripts: any, newScripts: any;

    if (
      !cached ||
      !this.previousScripts ||
      !this.currentScripts ||
      !this.costumeChanges
    ) {
      Object.assign(this, {
        previousScripts: await project.getPreviousScripts(spriteName),
        currentScripts: await project.getCurrentScripts(spriteName),
        costumeChanges: await project.getChangedAssets(),
      });
    }

    oldScripts = this.previousScripts;
    newScripts = this.currentScripts;

    const diffs = await parseScripts(
      project.projectName,
      oldScripts,
      newScripts
    );

    const costumeDiffs = this.costumeChanges[spriteName];
    const { blocks: blockTheme, gui: uiTheme } =
      Redux.getState().scratchGui.theme.theme;

    const config = {
      style:
        blockTheme === "high-contrast" ? "scratch3-high-contrast" : "scratch3",
      scale: 0.675,
    };

    const diffBlocks = () => {
      scratchblocks.renderMatching(".real-commit-wrap", config);

      const svg = this.querySelector(".scratchblocks svg > g")!;

      svg.querySelectorAll("rect.sb3-input-string").forEach((input) => {
        input.setAttribute("rx", "4");
        input.setAttribute("ry", "4");
      });

      svg.querySelectorAll("rect.sb3-input-dropdown").forEach((input) => {
        input.setAttribute("rx", "13");
        input.setAttribute("ry", "13");
      });

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
      }[blockTheme];
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
          this.highlightAsText(diffs, script);
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
          this.highlightAsText(diffs, script);
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
    diffs.forEach(async (diff, scriptNo) => {
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
                  class: `${settings.button} open-script`,
                  onclick: async (e: Event) => {
                    e.stopPropagation();
                    this.style.opacity = "0.5";
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
                      this.style.opacity = "1";
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

    if (costumeDiffs)
      Object.keys(costumeDiffs).forEach((assetName, _costNo) => {
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
      });

    const btnRef = this.querySelector(`button[script-no="${script}"]`)!;

    btnRef.classList.add("active-tab");
    const scriptDiff = btnRef.getAttribute("diff-type");

    // costume diff view
    const display = scriptDiff === "script" ? "block" : "none";
    document.querySelector<HTMLDivElement>(".copy-button")!.style.display =
      display;
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

    // dark mode
    this.querySelector(".diff-view")!.classList.toggle(
      "dark",
      uiTheme === "dark"
    );
    this.setDiffTheme(uiTheme);

    if (scriptDiff === "script") {
      $plainText.onchange(new Event("init"));
      $highlights.onchange(new Event("init"));
    }

    this.querySelector(".commit-wrap")?.classList.toggle(
      "costume-diff-wrap",
      scriptDiff === "costume"
    );

    // TODO: this is annoying, refactor sometime
    if (diffs[script] && diffs[script].status === "removed") {
      // TODO: localize
      const view = document.querySelector(".commit-view");
      const wrapper = details(
        summary({ style: "display: list-item" }, "This script was deleted")
      );
      if (view) {
        view.parentNode!.insertBefore(wrapper, view);
        wrapper.appendChild(view);
      }
    } else {
      if (this.querySelector("details")) {
        const el = document.querySelector(".commit-view")!;
        document.querySelector("#commits")!.appendChild(el);
        this.querySelector("details")!.remove();
      }
    }

    $highlights.checked = userSettings.highlights;
    $plainText.checked = userSettings.plainText;

    if (!this.open) this.showModal();
  }
}
