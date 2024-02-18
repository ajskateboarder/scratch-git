import initialize from "./initialize";
import Cmp from "./accessors";
import "./reloader";
// import { diff } from "./utils";
import { DiffModal } from "./modals/index";

(async () => {
  await import(
    "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
  );
  await import(
    "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
  );

  globalThis.diffs = undefined;
  globalThis.sprites = undefined;
  // window.diff = diff;
  // let addNote = setInterval(async () => {
  //   try {
  //     let saveStatus = document.querySelector(`.${Cmp.SAVE_STATUS}`).innerHTML;
  //     if (saveStatus.startsWith("<span>")) {
  //       let span = document.createElement("span");
  //       span.id = "shortcutNote";
  //       span.style.opacity = "0.7";
  //       span.innerText = "(Ctrl+Shift+S for commits)";
  //       document.querySelector(`.${Cmp.SAVE_STATUS}`).parentNode.after(span);
  //       clearInterval(addNote);
  //     }
  //   } catch {}
  // }, 500);

  window.onload = initialize;
})();
