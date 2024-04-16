import { guiTheme } from "../../utils";
import api, { Project } from "../../api";
import { Cmp, DarkBlocks } from "../../dom/index";

import { parseScripts, diff } from "./utils";
import van from "vanjs-core";

const { div, label, input, span, ul, button, p, aside, main, br, hr } =
  van.tags;

const Setting = (props: {}, name: string) =>
  div(
    { class: Cmp.SETTINGS_LABEL, ...props },
    label(
      { class: Cmp.SETTINGS_LABEL },
      input({
        class: [Cmp.SETTINGS_CHECKBOX, Cmp.CHECKBOX].join(" "),
        type: "checkbox",
        checked: false,
      }),
      span(name)
    )
  );

/** Displays differences between previous and current project states and handles commiting the changes to Git */
export class DiffModal extends HTMLDialogElement {
  //@ts-ignore
  scripts: HTMLUListElement; //@ts-ignore
  commits: HTMLParagraphElement; //@ts-ignore
  useHighlights: HTMLInputElement; //@ts-ignore
  plainText: HTMLInputElement; //@ts-ignore

  previousScripts: any;
  currentScripts: any;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;

    const useHighlights = Setting({}, "Use highlights");
    const plainText = Setting({ style: "margin-left: 10px;" }, "Plain text");
    const commits = p(
      { id: "commits" },
      span({ style: "display: flex" }, useHighlights, plainText),
      hr(),
      br(),
      p({ id: "commitView" })
    );
    const closeButton = button(
      {
        id: "closeButton",
        class: Cmp.SETTINGS_BUTTON,
        style: "margin-left: 10px",
        onclick: () => {
          useHighlights.querySelector("input")!.checked = false;
          plainText.querySelector("input")!.checked = false;
          this.close();
        },
      },
      "Okay"
    );

    this.scripts = ul({ id: "scripts" });
    this.useHighlights = useHighlights.querySelector("input")!;
    this.plainText = plainText.querySelector("input")!;
    this.commits = commits.querySelector("#commitView")!;

    van.add(
      this,
      div(
        { class: "sidebar" },
        aside(this.scripts),
        main(
          div(
            { class: "content" },
            commits,
            div(
              { class: ["bottom-bar", "in-diff-modal"].join(" ") },
              closeButton
            )
          )
        )
      )
    );
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`)!.appendChild(fragment);
    document
      .querySelector<HTMLDialogElement>(
        `dialog[is="${this.getAttribute("is")}"]`
      )!
      .showModal();
  }

  async diff(
    project: Project | undefined,
    sprite: string,
    script = 0,
    cached = false
  ) {
    // try again in case of undefined
    if (!project) project = await api.getCurrentProject();
    project = project!;

    let oldProject, newProject;
    if (cached) {
      if (
        this.previousScripts === undefined &&
        this.currentScripts === undefined
      ) {
        this.previousScripts = await project.getPreviousScripts(sprite);
        this.currentScripts = await project.getCurrentScripts(sprite);
      }
    } else {
      this.previousScripts = await project.getPreviousScripts(sprite);
      this.currentScripts = await project.getCurrentScripts(sprite);
    }
    oldProject = this.previousScripts;
    newProject = this.currentScripts;

    const scripts = parseScripts(oldProject, newProject);
    // not sure why all this isn't just done by diff()
    const diffs = (
      await Promise.all(
        scripts.map((script) => diff(script.oldContent, script.newContent))
      )
    )
      .map((diffed, i) => ({ ...diffed, ...scripts[i] }))
      .filter((result) => result.diffed !== "");

    let blockTheme = guiTheme().blocks;
    let config = {
      style:
        blockTheme === "high-contrast" ? "scratch3-high-contrast" : "scratch3",
      scale: 0.675,
    };

    const diffBlocks = () => {
      window.scratchblocks.appendStyles();
      window.scratchblocks.renderMatching("#commitView", config);
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

    this.scripts.innerHTML = "";
    this.commits.innerText = diffs[script].diffed ?? "";
    diffBlocks();
    this.commits.innerHTML += "<br>";

    const highlightDiff = () => {
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
              //@ts-ignore
              element.style = `fill: ${fillColor}; opacity: 0.5`;
            });
          diff.previousElementSibling!.after(moddedBlock);
          diff.remove();
        });
      });
    };

    let uiTheme = guiTheme().gui;

    const highlightPlain = () => {
      let content = diffs[script].diffed ?? "";
      this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
      if (this.useHighlights.checked) {
        let highlights = content
          .split("\n")
          .map(
            (e, i) =>
              `<span style="background-color: rgba(${
                e.startsWith("-")
                  ? "255,0,0,0.5"
                  : e.startsWith("+")
                  ? "0,255,0,0.5"
                  : "0,0,0,0"
              })">${i == 0 ? e.trimStart() : e}</span>`
          );
        this.commits.innerHTML = `<pre>${highlights.join("<br>")}</pre><br>`;
      }
    };

    const darkDiff = (theme: "dark" | "light") => {
      let svg = this.querySelectorAll(".scratchblocks svg > g");
      if (theme === "dark") {
        svg.forEach((blocks) => {
          blocks.querySelectorAll<SVGPathElement>("path.sb3-diff").forEach(
            //@ts-ignore
            (diff) => (diff.style = "stroke: white; stroke-width: 3.5px")
          );
        });
      } else {
        svg.forEach((blocks) => {
          blocks
            .querySelectorAll<SVGPathElement>("path.sb3-diff")
            //@ts-ignore
            .forEach((diff) => (diff.style = ""));
        });
      }
    };

    // fixes git diff snipping artifacts
    const removeExtraEnds = () => {
      if (this.plainText.checked) return;
      let svg = this.querySelector(".scratchblocks svg > g")!;
      svg.querySelectorAll(":scope > g").forEach((blocks) => {
        if (blocks.querySelectorAll("path").length === 1) {
          let block = blocks.querySelector("path")!;
          if (
            block.classList.length === 1 &&
            block.classList.contains("sb3-control") &&
            blocks.querySelector("text")!.innerHTML === "end"
          ) {
            blocks.remove();
          }
        }
      });
    };

    this.useHighlights.onchange = () => {
      if (this.useHighlights.checked) {
        highlightDiff();
        if (this.plainText.checked) {
          highlightPlain();
        }
      } else {
        if (this.plainText.checked) {
          let content = diffs[script].diffed ?? "";
          this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
        } else {
          this.commits.innerText = diffs[script].diffed ?? "";
          diffBlocks();
          removeExtraEnds();
          this.commits.innerHTML += "<br>";
        }
      }
      darkDiff(uiTheme);
    };

    this.plainText.onchange = () => {
      if (this.plainText.checked) {
        if (this.useHighlights.checked) {
          highlightPlain();
        } else {
          let content = diffs[script].diffed ?? "";
          this.commits.innerHTML = `<pre>${content.trimStart()}</pre><br>`;
        }
      } else {
        diffBlocks();
        this.commits.innerHTML += "<br>";
        removeExtraEnds();
        if (this.useHighlights.checked) highlightDiff();
      }
      darkDiff(uiTheme);
    };

    // assign diff displaying to diffs
    diffs.forEach(async (diff, i) => {
      let newItem = document.createElement("li");
      let link = document.createElement("button");
      link.classList.add("tab-btn");
      link.setAttribute("script-no", i.toString());
      if (i !== script) {
        link.onclick = async () => {
          document
            .querySelectorAll(".tab-btn")
            .forEach((e) => e.classList.remove("active-tab"));
          link.classList.add("active-tab");
          await this.diff(
            project,
            sprite,
            parseInt(
              this.querySelector("button.active-tab")!.getAttribute(
                "script-no"
              )!
            ),
            true
          );
        };
      }
      link.innerHTML = `<i class="fa-solid fa-square-${
        diff.status === "added"
          ? "plus"
          : diff.status === "removed"
          ? "xmark"
          : "minus"
      }"></i> Script ${diff.scriptNo}`;
      newItem.appendChild(link);
      this.scripts.appendChild(newItem);
    });

    document
      .querySelector(`button[script-no="${script}"]`)!
      .classList.add("active-tab");

    // dark mode
    if (uiTheme === "dark")
      document.querySelector("aside")!.classList.add("dark");
    else document.querySelector("aside")!.classList.remove("dark");
    darkDiff(uiTheme);
    removeExtraEnds();
    this.useHighlights.checked = false;
    this.plainText.checked = false;

    if (!this.open) this._showMe();
  }
}
