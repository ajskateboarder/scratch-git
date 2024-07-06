import { Modal } from "../base";
import { scrollBlockIntoView, flash } from "./block-utils";
import api, { CostumeChange, Project } from "@/core/api";
import { settings } from "@/core/components";
import { Checkbox, Copy } from "@/core/components";
import { Redux, scratchblocks } from "@/lib";
import { getBlockly } from "@/lib";
import { parseScripts, type ScriptStatus } from "@/core/diff-indicators";
import { userSettings } from "@/core/settings";
import van from "vanjs-core";

import iconCodeSvg from "./icon--code.svg";
import iconCostumesSvg from "./icon--costumes.svg";
import iconSoundsSvg from "./icon--sounds.svg";

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
  hr,
  i,
  li,
  img,
  audio,
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

const MIMETYPE_EXT = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
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

const toDataURI = (ext: string, content: string) =>
  `data:${MIMETYPE_EXT[ext as keyof typeof MIMETYPE_EXT]};base64,${btoa(
    content
  )}`;

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends Modal {
  private $!: {
    $scripts: HTMLUListElement;
    $commits: HTMLParagraphElement;
    $highlights: HTMLInputElement;
    $plainText: HTMLInputElement;
  };

  private cache!: {
    previousScripts: any;
    currentScripts: any;
    costumeChanges: Record<string, Record<string, CostumeChange[]>>;
  };

  private copyCallback!: () => string | SVGElement;

  connectedCallback() {
    if (this.querySelector("main")) return;

    this.copyCallback = () =>
      (this.querySelector(".scratchblocks svg") as SVGElement) ??
      (this.querySelector(".commit-wrap") as HTMLElement).innerText;

    const useHighlights = Checkbox({}, "Use highlights");
    const plainText = Checkbox({ style: "margin-left: 10px;" }, "Plain text");

    const closeButton = button(
      {
        class: settings.settingsButton,
        onclick: () => {
          useHighlights.querySelector("input")!.checked = false;
          plainText.querySelector("input")!.checked = false;
          this.close();
        },
      },
      i({ class: "fa-solid fa-xmark" })
    );

    const commits = p(
      { id: "commits" },
      span(
        {
          class: "header",
        },
        span({ class: "settings-group" }, useHighlights, plainText),
        span({ class: "button-group" }, closeButton)
      ),
      hr(),
      br(),
      pre(
        { class: "commit-view" },
        Copy(this.copyCallback),
        pre({ class: "commit-wrap" })
      )
    );

    this.$ = {
      $scripts: ul({ style: "max-width: 200px" }),
      $highlights: useHighlights.querySelector("input")!,
      $plainText: plainText.querySelector("input")!,
      $commits: commits.querySelector(".commit-wrap")!,
    };

    van.add(
      this,
      main(
        { class: "diff-view" },
        aside(this.$.$scripts),
        main(div({ class: "content" }, commits))
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
    const { $commits, $highlights } = this.$;

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

  public async display(
    project: Project | undefined,
    spriteName: string,
    script = 0,
    cached = false
  ) {
    const { $commits, $highlights, $plainText, $scripts } = this.$;

    // try again in case of undefined
    if (!project) project = api.getCurrentProject();
    project = project!;

    let oldScripts: any, newScripts: any;
    if (cached) {
      if (
        !this.cache.previousScripts &&
        !this.cache.currentScripts &&
        !this.cache.costumeChanges
      ) {
        this.cache = {
          previousScripts: await project.getPreviousScripts(spriteName),
          currentScripts: await project.getCurrentScripts(spriteName),
          costumeChanges: await project.getChangedCostumes(),
        };
      }
    } else {
      this.cache = {
        previousScripts: await project.getPreviousScripts(spriteName),
        currentScripts: await project.getCurrentScripts(spriteName),
        costumeChanges: await project.getChangedCostumes(),
      };
    }
    oldScripts = this.cache.previousScripts;
    newScripts = this.cache.currentScripts;

    const diffs = await parseScripts(
      project.projectName,
      oldScripts,
      newScripts
    );
    const costumeDiffs = this.cache.costumeChanges[spriteName];
    const { blocks: blockTheme, gui: uiTheme } =
      Redux.getState().scratchGui.theme.theme;

    const config = {
      style:
        blockTheme === "high-contrast" ? "scratch3-high-contrast" : "scratch3",
      scale: 0.675,
    };

    const diffBlocks = () => {
      scratchblocks.appendStyles();
      scratchblocks.renderMatching(".commit-wrap", config);

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
      const labelText = getBlockly()
        .getBlockById(window._changedScripts[spriteName][scriptNo])
        .comment?.getLabelText();
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
                  class: `${settings.settingsButton} open-script`,
                  onclick: async (e: Event) => {
                    e.stopPropagation();
                    this.close();
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
                    flash(getBlockly().getBlockById(id));
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
    const isScriptDiff = btnRef.getAttribute("diff-type") === "script";

    // costume diff view
    document.querySelector<HTMLDivElement>(".copy-button")!.style.display =
      isScriptDiff ? "block" : "none";
    document
      .querySelector<HTMLDivElement>(".settings-group")!
      .classList.toggle("disabled-area", !isScriptDiff);

    if (!isScriptDiff) {
      document.querySelector(".scratchblocks")!.remove();
      const [current, previous] =
        costumeDiffs[btnRef.getAttribute("asset-name")!];
      const isSoundDiff = btnRef.getAttribute("diff-type") === "sound";

      let previousAsset = "";
      let currentAsset = "";
      if (current && previous) {
        previousAsset = toDataURI(
          previous.path.split(".").pop()!,
          String.fromCharCode.apply(null, previous.contents)
        );
        currentAsset = toDataURI(
          current.path.split(".").pop()!,
          String.fromCharCode.apply(null, current.contents)
        );
      } else {
        if (current && !previous && current.kind !== "before") {
          currentAsset = toDataURI(
            current.path.split(".").pop()!,
            String.fromCharCode.apply(null, current.contents)
          );
        } else if (current.kind === "before" && !previous) {
          previousAsset = toDataURI(
            current.path.split(".").pop()!,
            String.fromCharCode.apply(null, current.contents)
          );
        }
      }

      $commits.appendChild(
        span(
          { class: "costume-diff" },
          isSoundDiff
            ? audio({ src: previousAsset, controls: true })
            : img({ src: previousAsset }),
          i({ class: "fa-solid fa-arrow-right" }),
          isSoundDiff
            ? audio({ src: currentAsset, controls: true })
            : img({ src: currentAsset })
        )
      );
    }

    // dark mode
    if (uiTheme === "dark")
      this.querySelector(".diff-view")!.classList.add("dark");
    else this.querySelector(".diff-view")!.classList.remove("dark");

    this.setDiffTheme(uiTheme);

    if (isScriptDiff) {
      $plainText.onchange(new Event("init"));
      $highlights.onchange(new Event("init"));
    }

    $highlights.checked = userSettings.highlights;
    $plainText.checked = userSettings.plainText;

    if (!this.open) this.showModal();
  }
}
