import initialize from "./initialize";
import "./reloader";

(async () => {
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
