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

  document.querySelector(BUTTON_ROW).innerHTML += html`<dialog id="commitLog">
    <div class="content">
      <div class="sidebar">
        <ul>
          <li><a href="#">script 1</a></li>
          <li><a href="#">script 2</a></li>
        </ul>
        <br />
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

function findArrayChanges(oldArray, newArray) {
  const dp = new Array(oldArray.length + 1)
    .fill(null)
    .map(() => new Array(newArray.length + 1).fill(0));

  for (let i = 1; i <= oldArray.length; i++) {
    for (let j = 1; j <= newArray.length; j++) {
      if (oldArray[i - 1] === newArray[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const changes = {
    added: [],
    removed: [],
    modified: [],
  };

  let i = oldArray.length;
  let j = newArray.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArray[i - 1] === newArray[j - 1]) {
      i--;
      j--;
    } else if (j === 0 || (i > 0 && dp[i][j] === dp[i - 1][j])) {
      changes.removed.push(oldArray[i - 1]);
      i--;
    } else if (i === 0 || (j > 0 && dp[i][j] === dp[i][j - 1])) {
      changes.added.push(newArray[j - 1]);
      j--;
    } else {
      changes.modified.push({
        from: oldArray[i - 1],
        to: newArray[j - 1],
      });
      i--;
      j--;
    }
  }

  changes.added.reverse();
  changes.removed.reverse();

  return changes;
}

function mergeArrays(baseArray, newArray) {
  const mergedArray = [...baseArray];

  for (const newItem of newArray) {
    if (!mergedArray.includes(newItem)) {
      mergedArray.push(newItem);
    }
  }

  return mergedArray;
}

const zip = (a, b) => a.map((k, i) => [k, b[i]]);

setInterval(() => {
  try {
    document.querySelector(".save-status_save-now_xBhky").onclick = () => {
      (async () => {
        const oldProject = await (
          await fetch("http://localhost:6969/project.json")
        ).json();

        await fetch("http://localhost:6969/commit");
        pause(1000);

        const newProject = await (
          await fetch("http://localhost:6969/project.json")
        ).json();

        await import(
          "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
        );
        await import(
          "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
        );

        const oldBlocks = parseSB3Blocks.toScratchblocks(
          Object.keys(oldProject).filter(
            (key) => oldProject[key].opcode === "event_whenflagclicked"
          )[0],
          oldProject,
          "en",
          {
            tabs: " ".repeat(4),
          }
        );

        const newBlocks = parseSB3Blocks.toScratchblocks(
          Object.keys(newProject).filter(
            (key) => newProject[key].opcode === "event_whenflagclicked"
          )[0],
          newProject,
          "en",
          {
            tabs: " ".repeat(4),
          }
        );

        const oldBlocksSplit = Array.from(oldBlocks.split("\n")).map(
          (item, i) => `${i} ${item}`
        );
        const newBlocksSplit = Array.from(newBlocks.split("\n")).map(
          (item, i) => `${i} ${item}`
        );

        const diff = findArrayChanges(oldBlocksSplit, newBlocksSplit);
        let merged = mergeArrays(oldBlocksSplit, newBlocksSplit);

        document.querySelector("#commits").innerText = merged
          .map((item) => item.slice(2))
          .join("\n");
        document.querySelector("#commitLog").showModal();
        scratchblocks.renderMatching("#commits", {
          style: "scratch3",
          scale: 0.675,
        });

        const scratch = Array.from(
          document.querySelectorAll(".scratchblocks-style-scratch3 > g > g > g")
        );

        merged.forEach((item, i) => {
          if (diff.removed.includes(item)) {
            const block = scratch[i].querySelector("path").cloneNode(true);
            block.style.fill = "red";
            block.style.opacity = "0.5";
            scratch[i].appendChild(block);
          }
        });
        merged.forEach((item, i) => {
          if (diff.added.includes(item)) {
            const block = scratch[i].querySelector("path").cloneNode(true);
            block.style.fill = "green";
            block.style.opacity = "0.5";
            scratch[i].appendChild(block);
          }
        });

        // Array.from(scratch)
        //   .slice(1, -1)
        //   .forEach((element) => {
        //     const path = element.querySelector("path").cloneNode(true);
        //     path.style.fill = "red";
        //     path.style.opacity = "0.5";
        //     path.style.strokeWidth = "0";
        //     element.appendChild(path);
        //   });
      })();
    };
  } catch {}
}, 500);
