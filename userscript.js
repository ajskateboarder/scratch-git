// Don't question this code

// https://stackoverflow.com/a/27870199/16019146
function pause(ms) {
  var date = Date.now();
  var curDate;
  do {
    curDate = Date.now();
  } while (curDate - date < ms);
}

// Funny editor "hack" so I don't need htm
const html = (string) => string;

window.onload = () => {
  document.head.innerHTML += `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">`;
  document.head.innerHTML += html`<style>
    #push-status:hover {
      cursor: pointer;
    }
  </style>`;

  let BUTTON_ROW =
    "#app > div > div.gui_menu-bar-position_RwwFc.menu-bar_menu-bar_48TYq.box_box_-Ky8F > div.menu-bar_main-menu_ZLuRH > div:nth-child(6)";

  document.querySelector(BUTTON_ROW).innerHTML += html`&nbsp;
    <div class="menu-bar_account-info-group_uqH-z">
      <div class="menu-bar_menu-bar-item_hHpQG">
        <div id="push-status">
          <span>Push project</span>
        </div>
      </div>
    </div>`;

  setTimeout(() => {
    document.querySelector("#push-status").onclick = () => {
      (async () => {
        const res = await fetch("http://localhost:6969/push");
        console.log(await res.json());
        alert("I think it pushed now :)");
      })();
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
