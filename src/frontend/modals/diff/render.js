import { parseScripts } from "./block-parser";
import api from "../../api";
import { scratchAlert } from "../../gui-components";
import { diff } from "../../utils";

/**
 * Render diffs from a script from a sprite
 * @param {{modalElement: HTMLDialogElement; styleElement: HTMLSelectElement; sprite: string; script: number; style: "scratch3" | "scratch3-high-contrast" | "scratch2")}}
 */
export async function showDiffs({
  modalElement,
  styleElement,
  sprite,
  script = 0,
  style,
}) {
  let project = await api.getCurrentProject();
  // try again in case of undefined
  if (!project) {
    project = await api.getCurrentProject();
  }
  let sprites = await project.getSprites();

  const oldProject = await project.getPreviousScripts(sprite);
  const newProject = await project.getCurrentScripts(sprite);

  let scripts = parseScripts(oldProject, newProject);
  let diffs = (
    await Promise.all(
      scripts.map((script) => diff(script.oldContent, script.newContent))
    )
  )
    .map((diffed, i) => ({ ...diffed, ...scripts[i] }))
    .filter((result) => result.diffed !== "")
    .map((result) => {
      if (!result.diffed.trimStart().startsWith("when @greenFlag clicked")) {
        return {
          ...result,
          diffed: " when @greenFlag clicked\n" + result.diffed.trimStart(),
        };
      }
      return result;
    });

  document.querySelector("#scripts").innerHTML = "";
  document.querySelector("#commits").innerText = diffs[script].diffed;

  scratchblocks.appendStyles();
  scratchblocks.renderMatching("#commits", {
    style: "scratch3",
    scale: 0.675,
  });

  document.querySelector("#commitButton").onclick = async () => {
    const message = await project.commit();
    modalElement.close();
    scratchAlert({
      message: `Commit successful. ${message}`,
      duration: 5000,
    });
  };

  if (!modalElement.open) {
    modalElement.showModal();
  }

  document.querySelector(".topbar").innerHTML = "";

  sprites.forEach((sprite) => {
    let newItem = document.createElement("a");
    newItem.href = "#whatever";
    newItem.appendChild(document.createTextNode(sprite));
    newItem.onclick = async () => {
      document
        .querySelectorAll(".topbar a")
        .forEach((e) => e.classList.remove("active-tab"));
      newItem.classList.add("active-tab");

      await showDiffs({
        modalElement,
        styleElement,
        sprite: sprite,
        style: styleElement.value,
      });
    };
    document.querySelector(".topbar").appendChild(newItem);
  });

  diffs.forEach(async (diff, i) => {
    let newItem = document.createElement("li");
    let link = document.createElement("button");
    link.classList.add("tab-btn");
    link.setAttribute("script-no", i);
    link.onclick = async () => {
      document
        .querySelectorAll(".tab-btn")
        .forEach((e) => e.classList.remove("active-tab"));
      link.classList.add("active-tab");
      await showDiffs({
        modalElement,
        styleElement,
        sprite: sprite,
        script: document
          .querySelector("button.active-tab")
          .getAttribute("script-no"),
        style: styleElement.value,
      });
    };
    link.innerHTML = `<i class="fa-solid fa-square-${
      diff.status === "added"
        ? "plus"
        : diff.status === "removed"
        ? "xmark"
        : "minus"
    }"></i> Script ${diff.scriptNo}`;
    newItem.appendChild(link);
    document.querySelector("#scripts").appendChild(newItem);
  });

  if (document.querySelector("body").getAttribute("theme") === "dark") {
    document.querySelector(".sidebar").classList.add("dark");
    document.querySelector(".topbar").classList.add("dark");
  } else {
    document.querySelector(".sidebar").classList.remove("dark");
  }
}
