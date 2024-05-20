import api, { Project } from "@/api";
import { settings } from "@/components";

import { parseScripts, type ScriptStatus } from "@/scripts";
import { scrollBlockIntoView, flash } from "./block-utils";
import van from "vanjs-core";
import { Checkbox, Copy } from "@/components";
import { Redux, scratchblocks } from "@/lib";
import { getBlockly } from "@/lib";
import { Modal } from "../base";

const { div, span, ul, button, p, pre, aside, main, br, hr, i, li } = van.tags;

enum DiffIcon {
  added = "fa-solid fa-square-plus",
  removed = "fa-solid fa-square-xmark",
  modified = "fa-solid fa-square-minus",
}

/** Dark mode block fill colors that TurboWarp use */
enum DarkBlocks {
  "sb3-motion" = "#0F1E33",
  "sb3-looks" = "#1E1433",
  "sb3-sound" = "#291329",
  "sb3-events" = "#332600",
  "sb3-control" = "#332205",
  "sb3-sensing" = "#12232A",
  "sb3-operators" = "#112611",
  "sb3-variables" = "#331C05",
  "sb3-list" = "#331405",
  "sb3-custom" = "#331419",
  "sb3-extension" = "#03251C",
}

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

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends Modal {
  private $scripts!: HTMLUListElement;
  private $commits!: HTMLParagraphElement;
  private $highlights!: HTMLInputElement;
  private $plainText!: HTMLInputElement;

  private previousScripts: any;
  private currentScripts: any;

  private copyCallback!: () => string | SVGElement;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;

    const useHighlights = Checkbox({}, "Use highlights");
    const plainText = Checkbox({ style: "margin-left: 10px;" }, "Plain text");
    const closeButton = button(
      {
        id: "closeButton",
        class: [settings.settingsButton, "close-button"].join(" "),
        onclick: () => {
          useHighlights.querySelector("input")!.checked = false;
          plainText.querySelector("input")!.checked = false;
          this.close();
        },
      },
      i({ class: "fa-solid fa-xmark" })
    );

    this.copyCallback = () =>
      (this.querySelector(".scratchblocks svg") as SVGElement) ??
      (this.querySelector(".commit-wrap") as HTMLElement).innerText;

    const commits = p(
      { id: "commits" },
      span({ style: "display: flex" }, useHighlights, plainText, closeButton),
      hr(),
      br(),
      pre(
        { class: "commit-view" },
        Copy(this.copyCallback),
        pre({ class: "commit-wrap" })
      )
    );

    this.$scripts = ul({ id: "scripts" });
    this.$highlights = useHighlights.querySelector("input")!;
    this.$plainText = plainText.querySelector("input")!;
    this.$commits = commits.querySelector(".commit-wrap")!;

    van.add(
      this,
      main(
        { class: "diff-view" },
        aside(this.$scripts),
        main(div({ class: "content" }, commits))
      )
    );
  }

  /** Highlights diffs as blocks */
  private highlightAsBlocks() {
    let svg = this.querySelectorAll(".scratchblocks svg > g");

    svg.forEach((blocks) => {
      blocks.querySelectorAll("path.sb3-diff").forEach((diff) => {
        let moddedBlock = diff.previousElementSibling!.cloneNode(
          true
        ) as SVGElement;
        let fillColor = diff.classList.contains("sb3-diff-ins")
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
    // TODO: passing in diffs and script idx is probably unneeded
    let content = diffs[script].diffed.trimStart() ?? "";
    this.$commits.innerHTML = `<pre>${content}</pre><br>`;

    if (this.$highlights.checked) {
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
      this.$commits.innerHTML = "";
      this.$commits.append(
        pre(
          // @ts-ignore
          highlights.reduce((x, y) => (x === null ? [y] : [x, br(), y]), null)
        )
      );
    }

    this.copyCallback = () => content;
  }

  /** Sets theme of diff viewer */
  private setDiffTheme(theme: "dark" | "light") {
    let svg = this.querySelectorAll(".scratchblocks svg > g");
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
    // try again in case of undefined
    if (!project) project = await api.getCurrentProject();
    project = project!;

    let oldScripts: any, newScripts: any;
    if (cached) {
      if (
        this.previousScripts === undefined &&
        this.currentScripts === undefined
      ) {
        this.previousScripts = await project.getPreviousScripts(spriteName);
        this.currentScripts = await project.getCurrentScripts(spriteName);
      }
    } else {
      this.previousScripts = await project.getPreviousScripts(spriteName);
      this.currentScripts = await project.getCurrentScripts(spriteName);
    }
    oldScripts = this.previousScripts;
    newScripts = this.currentScripts;

    const diffs = await parseScripts(oldScripts, newScripts);

    let { blocks: blockTheme, gui: uiTheme } =
      Redux.getState().scratchGui.theme.theme;

    let config = {
      style:
        blockTheme === "high-contrast" ? "scratch3-high-contrast" : "scratch3",
      scale: 0.675,
    };

    const diffBlocks = () => {
      scratchblocks.appendStyles();
      scratchblocks.renderMatching(".commit-wrap", config);

      let svg = this.querySelector(".scratchblocks svg > g")!;

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
              let darkFill =
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
              let darkFill =
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
      let dropdownChange = {
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

    this.$scripts.innerHTML = "";
    this.$commits.innerText = diffs[script]?.diffed ?? "";
    diffBlocks();

    this.$highlights.onchange = () => {
      localStorage.setItem(
        "scratch-git:highlights",
        this.$highlights.checked.toString()
      );
      if (this.$highlights.checked) {
        this.highlightAsBlocks();
        if (this.$plainText.checked) {
          this.highlightAsText(diffs, script);
        }
      } else {
        if (this.$plainText.checked) {
          let content = diffs[script].diffed ?? "";
          this.$commits.innerHTML = "";
          this.$commits.append(pre(content.trimStart()));
        } else {
          this.$commits.innerText = diffs[script].diffed ?? "";
          diffBlocks();
        }
      }
      this.setDiffTheme(uiTheme);
    };

    this.$plainText.onchange = (e) => {
      localStorage.setItem(
        "scratch-git:plaintext",
        this.$plainText.checked.toString()
      );
      if (this.$plainText.checked) {
        if (this.$highlights.checked) {
          this.highlightAsText(diffs, script);
        } else {
          let content = diffs[script].diffed ?? "";
          this.$commits.innerHTML = "";
          this.$commits.append(pre(content.trimStart()));
        }
      } else {
        if (e.type !== "init") {
          diffBlocks();
          if (this.$highlights.checked) this.highlightAsBlocks();
        }
      }
      this.setDiffTheme(uiTheme);
    };

    // assign diff displaying to diffs
    diffs.forEach(async (diff, scriptNo) => {
      let diffButton = li(
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
                      window.ReduxStore.getState().scratchGui.editorTab
                        .activeTabIndex !== 0
                    ) {
                      window.ReduxStore.dispatch({
                        type: "scratch-gui/navigation/ACTIVATE_TAB",
                        activeTabIndex: 0,
                      });
                    }
                    let id = window._changedScripts[scriptNo];
                    scrollBlockIntoView(id);
                    flash(getBlockly().getBlockById(id));
                  },
                },
                i({ class: "fa-solid fa-up-right-from-square" })
              )
            : undefined
        )
      );

      diffButton
        .querySelector("button")!
        .setAttribute("script-no", scriptNo.toString());

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

      this.$scripts.appendChild(diffButton);
    });

    this.querySelector(`button[script-no="${script}"]`)!.classList.add(
      "active-tab"
    );

    // dark mode
    if (uiTheme === "dark")
      this.querySelector(".diff-view")!.classList.add("dark");
    else this.querySelector(".diff-view")!.classList.remove("dark");

    this.setDiffTheme(uiTheme);

    this.$highlights.checked = JSON.parse(
      localStorage.getItem("scratch-git:highlights")!
    );

    this.$plainText.checked = JSON.parse(
      localStorage.getItem("scratch-git:plaintext")!
    );
    this.$plainText.onchange(new Event("init"));
    this.$highlights.onchange(new Event("init"));

    if (!this.open) this.showModal();
  }

  public refresh() {
    this.querySelector("main")?.remove();
    this.connectedCallback();
  }
}
