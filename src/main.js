import initialize from "./initialize";
import Cmp from "./accessors";

import { diff } from "./modals/index";

(async () => {
  await import(
    "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
  );
  await import(
    "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
  );

  globalThis.diffs = undefined;
  globalThis.sprites = undefined;

  // This doesn't seem to work right now
  let addNote = setInterval(async () => {
    try {
      let saveStatus = document.querySelector(`.${Cmp.SAVE_STATUS}`).innerHTML;
      if (saveStatus.startsWith("<span>")) {
        let span = document.createElement("span");
        span.id = "shortcutNote";
        span.style.opacity = "0.7";
        span.appendChild(document.createTextNode("(Ctrl+Shift+S for commits)"));
        document
          .querySelector(".save-status_save-now_xBhky")
          .parentNode.after(span);
        clearInterval(addNote);
      }
    } catch { }
  }, 500);

  setInterval(async () => {
    try {
      document.querySelector(`.${Cmp.SAVE_STATUS}`).onclick = diff.display;
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "S") {
          await diff.display();
          document.querySelector("#shortcutNote").remove();
        }
      };
    } catch { }
  }, 500);

  window.onload = initialize;
})();
