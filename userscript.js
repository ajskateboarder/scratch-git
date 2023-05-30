// This code is so terrible. This is why you don't use JavaScript, kids

// https://stackoverflow.com/a/27870199/16019146
function pause(ms) {
  var date = Date.now();
  var curDate;
  do {
    curDate = Date.now();
  } while (curDate - date < ms);
}

// I can just make a mock html tagged template (win-win :D)
const html = (string) => string;

window.onload = () => {
  document.head.innerHTML += `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`;

  let BUTTON_ROW =
    "#app > div > div.gui_menu-bar-position_RwwFc.menu-bar_menu-bar_48TYq.box_box_-Ky8F > div.menu-bar_main-menu_ZLuRH > div:nth-child(6)";

  // I bet nearly all of this html isn't necessary to make a button
  document.querySelector(BUTTON_ROW).innerHTML += html`<div
      class="menu-bar_menu-bar-item_hHpQG"
    ></div>
    <div class="menu-bar_menu-bar-item_hHpQG"></div>
    <a
      class="menu-bar_feedback-link_SgtH9"
      rel="noopener noreferrer"
      target="_blank"
      ><span
        class="button_outlined-button_GKHtu menu-bar_feedback-button_6MABs"
        role="button"
        ><div class="button_content_FRb-C" id="showCommitLog">
          <span
            ><i class="fa-brands fa-git-alt fa-lg"></i> Project commits</span
          >
        </div></span
      >
    </a>`;
  document.querySelector(
    BUTTON_ROW
  ).innerHTML += `<dialog id="commitLog" style="padding: 20px"><p id="commits">Hello worldus</p><button>Okay</button></dialog>`;
  setTimeout(() => {
    document.querySelector("#showCommitLog").onclick = () => {
      document.querySelector("#commitLog").showModal();
    };
  }, 500);
};

setInterval(() => {
  try {
    document.querySelector(".save-status_save-now_xBhky").onclick = () => {
      (async () => {
        const res = await fetch("http://localhost:6969/commit");
        pause(1000);
        console.log(await res.json());
      })();
    };
  } catch {}
}, 500);
