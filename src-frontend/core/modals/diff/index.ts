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

const { div, span, ul, button, p, pre, aside, main, br, hr, i, li, img } =
  van.tags;

const DiffIcon = {
  added: "fa-solid fa-square-plus",
  removed: "fa-solid fa-square-xmark",
  modified: "fa-solid fa-square-minus",
};

/** Dark mode block fill colors that TurboWarp use */
const DarkBlocks = {
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

const toDataURI = (ext: string, content: string) =>
  `data:image/${ext === "svg" ? "svg+xml" : ext};base64,${btoa(content)}`;

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends Modal {
  private $!: {
    $scripts: HTMLUListElement;
    $commits: HTMLParagraphElement;
    $highlights: HTMLInputElement;
    $plainText: HTMLInputElement;
  };

  private previousScripts: any;
  private currentScripts: any;
  private costumeChanges!: Record<string, Record<string, CostumeChange[]>>;

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
      $scripts: ul({ id: "scripts" }),
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
        this.previousScripts === undefined &&
        this.currentScripts === undefined
      ) {
        this.previousScripts = await project.getPreviousScripts(spriteName);
        this.currentScripts = await project.getCurrentScripts(spriteName);
        this.costumeChanges = await project.getChangedCostumes();
      }
    } else {
      this.previousScripts = await project.getPreviousScripts(spriteName);
      this.currentScripts = await project.getCurrentScripts(spriteName);
      this.costumeChanges = await project.getChangedCostumes();
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
                DarkBlocks[
                  element.classList.item(0) as keyof typeof DarkBlocks
                ];
              if (darkFill) {
                element.style.fill = darkFill;
              }
            });
          blocks
            .querySelectorAll<SVGPathElement | SVGRectElement>("path, rect")
            .forEach((element) => {
              const darkFill =
                DarkBlocks[
                  element.classList.item(0) as keyof typeof DarkBlocks
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
      const diffButton = li(
        button(
          { class: "tab-btn" },
          i({ class: `${DiffIcon[diff.status]} change-icon` }),
          `Script ${diff.scriptNo}`,
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
      Object.keys(costumeDiffs).forEach((costumeName, _costNo) => {
        const costNo = lastScriptNo + _costNo;

        const diffButton = li(
          button(
            { class: "tab-btn" },
            // i({ class: `${DiffIcon[diff.status]} change-icon` }),
            `Costume ${costumeName}`
          )
        );

        const btnRef = diffButton.querySelector("button")!;
        btnRef.setAttribute("script-no", costNo.toString());
        btnRef.setAttribute("diff-type", "costume");
        btnRef.setAttribute("costume-name", costumeName);

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
        costumeDiffs[btnRef.getAttribute("costume-name")!];

      let previousCostume = "";
      let currentCostume = "";
      if (current && previous) {
        previousCostume = toDataURI(
          previous.costumePath.split(".").pop()!,
          String.fromCharCode.apply(null, previous.contents)
        );
        currentCostume = toDataURI(
          current.costumePath.split(".").pop()!,
          String.fromCharCode.apply(null, current.contents)
        );
      } else {
        if (current && !previous && current.kind !== "before") {
          currentCostume = toDataURI(
            current.costumePath.split(".").pop()!,
            String.fromCharCode.apply(null, current.contents)
          );
        } else if (current.kind === "before" && !previous) {
          previousCostume = toDataURI(
            current.costumePath.split(".").pop()!,
            String.fromCharCode.apply(null, current.contents)
          );
        }
      }

      $commits.appendChild(
        span(
          { class: "costume-diff" },
          img({ src: previousCostume }),
          i({ class: "fa-solid fa-arrow-right" }),
          img({ src: currentCostume })
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
