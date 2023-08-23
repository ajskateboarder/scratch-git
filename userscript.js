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
    .content {
      display: flex;
    }
    .sidebar {
      width: fit-content;
      background-color: #f0f0f0;
      position: sticky;
      top: 0;
      padding: 10px;
      height: 100%;
    }
    .sidebar ul {
      list-style-type: none;
      margin: 0;
      padding: 0;
    }
    .sidebar li {
      list-style-type: none;
    }
    .blocks {
      flex: 1;
      padding: 20px;
    }
    .bottom {
      margin-top: auto;
    }
    #commitLog {
      height: 50%;
      max-height: 50%;
      width: 50%;
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

  document.querySelector(BUTTON_ROW).innerHTML += html` <dialog id="commitLog">
    <div class="content">
      <div class="sidebar">
        <ul>
          <li><a href="#">tab 1</a></li>
          <li><a href="#">tab 2</a></li>
        </ul>
        <button class="bottom">Okay</button>
      </div>
      <div class="blocks">
        <p id="commits">Hello worldus</p>
      </div>
    </div>
  </dialog>`;

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
        await fetch("http://localhost:6969/commit");
        pause(1000);

        const project = await (
          await fetch("http://localhost:6969/project.json")
        ).json();

        await import(
          "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
        );
        await import(
          "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
        );

        const blocks = parseSB3Blocks.toScratchblocks(
          Object.keys(project).filter(
            (key) => project[key].opcode === "event_whenflagclicked"
          )[0],
          project,
          "en",
          {
            tabs: " ".repeat(4),
          }
        );
        console.log(blocks);
        document.querySelector("#commits").innerText = blocks;
        document.querySelector("#commitLog").showModal();
        scratchblocks.renderMatching("#commits", {
          style: "scratch3",
          scale: 0.675,
        });
      })();
    };
  } catch {}
}, 500);
