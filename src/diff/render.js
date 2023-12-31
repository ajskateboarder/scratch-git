import { createDiffs } from "./index";
import API from "../api";

export function parseBlocks(oldProject, newProject, scriptNumber) {
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

export function rerender(style) {
  const activeButton = parseInt(
    document
      .querySelector("button[class='tab-btn active-tab']")
      .getAttribute("script-no")
  );
  globalThis.diffs[activeButton].renderBlocks(style);
}

/**
 * Render diffs from a script from a sprite
 * @param {{sprite: string; script: number?; style: "scratch3" | "scratch3-high-contrast" | "scratch2")}}
 */
export async function showDiffs({ sprite, script = 0, style }) {
  let project = await API.getCurrentProject();

  await import(
    "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
  );
  await import(
    "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
  );

  const oldProject = await project.getPreviousScripts(sprite);
  const newProject = await project.getCurrentScripts(sprite);
  const diffs = createDiffs(oldProject, newProject);

  document.querySelector("#scripts").innerHTML = "";
  document.querySelector("#commits").innerHTML = "";

  document.querySelector("#commitButton").onclick = async () => {
    const message = await project.commit();
    document.querySelector("#commitLog").close();
    new Alert({
      message: `Commit successful. ${message}`,
      duration: 5000,
    }).display();
  };

  Array.from(Object.values(diffs)).flat(Infinity)[script].renderBlocks(style);

  const modal = document.querySelector("#commitLog");
  if (!modal.open) {
    modal.showModal();
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
        style: document.querySelector("#styleChoice").value,
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
          style: document.querySelector("#styleChoice").value,
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

export async function initDiffs() {
  let project = await API.getCurrentProject();
  await project.unzip();

  globalThis.sprites = await project.getSprites();

  document.querySelector("#styleChoice").value = "scratch3";

  await showDiffs({ sprite: globalThis.sprites[0] });
}
