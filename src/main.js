import initialize from "./initialize";
import Cmp from "./accessors";
import { initDiffs } from "./diff/render";


(async () => {
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
      document.querySelector(`.${Cmp.SAVE_STATUS}`).onclick = initDiffs;
      document.onkeydown = async (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === "S") {
          await initDiffs();
          document.querySelector("#shortcutNote").remove();
        }
      };
    } catch { }
  }, 500);

  window.onload = initialize;
})();
