import { createDiffs } from "../../diff/diff";
import api from "../../api";
import { scratchAlert } from "../../gui-components";


export default function (oldProject, newProject, scriptNumber) {
  const oldBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(oldProject).filter((key) =>
      oldProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    oldProject,
    "en",
    {
      tabs: "",
    }
  );

  const newBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(newProject).filter((key) =>
      newProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    newProject,
    "en",
    {
      tabs: "",
    }
  );

  return {
    oldBlocks,
    newBlocks,
  };
}


/**
 * Render diffs from a script from a sprite
 * @param {{modalElement: HTMLDialogElement; styleElement: HTMLSelectElement; sprite: string; script: number?; style: "scratch3" | "scratch3-high-contrast" | "scratch2")}}
 */
export async function showDiffs({ modalElement, styleElement, sprite, script = 0, style }) {
  let project = await api.getCurrentProject();

  const oldProject = await project.getPreviousScripts(sprite);
  const newProject = await project.getCurrentScripts(sprite);
  const diffs = createDiffs(oldProject, newProject);

  document.querySelector("#scripts").innerHTML = "";
  document.querySelector("#commits").innerHTML = "";

  document.querySelector("#commitButton").onclick = async () => {
    const message = await project.commit();
    modalElement.close();
    scratchAlert({
      message: `Commit successful. ${message}`,
      duration: 5000,
    });
  };

  await Array.from(Object.values(diffs)).flat(Infinity)[script].renderBlocks(style);

  if (!modalElement.open) {
    modalElement.showModal();
  }

  document.querySelector(".topbar").innerHTML = "";

  globalThis.sprites.forEach((sprite) => {
    let newItem = document.createElement("a");
    newItem.href = "#whatever";
    newItem.appendChild(document.createTextNode(sprite));
    newItem.onclick = async () => {
      document
        .querySelectorAll(".topbar a")
        .forEach((e) => e.classList.remove("active-tab"));
      newItem.classList.add("active-tab");

      await showDiffs({
        sprite: sprite,
        style: styleElement.value,
      });
    };
    document.querySelector(".topbar").appendChild(newItem);
  });

  Array.from(Object.values(diffs))
    .flat(Infinity)
    .forEach((diff, i) => {
      let newItem = document.createElement("li");
      let link = document.createElement("button");
      link.title = diff.status.charAt(0).toUpperCase() + diff.status.slice(1);
      link.classList.add("tab-btn");
      link.setAttribute("script-no", i);
      link.onclick = async () => {
        document
          .querySelectorAll(".tab-btn")
          .forEach((e) => e.classList.remove("active-tab"));
        link.classList.add("active-tab");

        await showDiffs({
          sprite: document.querySelector("a.active-tab").innerText,
          script: i,
          style: styleElement.value,
        });
      };
      switch (diff.status) {
        case "added":
          link.innerHTML = `<i class="fa-solid fa-square-plus"></i> Script ${diff.scriptNo}`;
          break;
        case "modified":
          link.innerHTML = `<i class="fa-solid fa-square-minus"></i> Script ${diff.scriptNo}`;
          break;
        case "removed":
          link.innerHTML = `<i class="fa-solid fa-square-xmark"></i> Script ${diff.scriptNo}`;
          break;
      }
      newItem.appendChild(link);
      document.querySelector("#scripts").appendChild(newItem);
    });

  document.querySelectorAll(".tab-btn")[script].classList.add("active-tab");
  document
    .querySelectorAll(".topbar a")
  [globalThis.sprites.indexOf(sprite)].classList.add("active-tab");

  globalThis.diffs = Array.from(Object.values(diffs)).flat(Infinity);
  if (document.querySelector("body").getAttribute("theme") === "dark") {
    document.querySelector(".sidebar").classList.add("dark");
    document.querySelector(".topbar").classList.add("dark");
  } else {
    document.querySelector(".sidebar").classList.remove("dark");
  }
}
