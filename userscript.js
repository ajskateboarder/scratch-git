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
      position: fixed;
      top: 25%;
      height: 50%;
      padding-right: 5px;
      border-right: 1px solid grey;
      background-color: #e6f0ff;
      overflow: auto;
    }
    .sidebar ul {
      list-style-type: none;
      margin: 0;
      padding: 0;
    }
    .sidebar li {
      list-style-type: none;
    }
    .sidebar li button {
      padding: 15px 30px;
      border: 0.5px solid grey;
      background-color: #d9e3f2;
      color: hsla(225, 15%, 40%, 0.75);
      transition: 0.2s background-color ease-in;
      margin-top: 10px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    .sidebar li button:hover {
      background-color: #ccd3dd;
    }
    .sidebar li button.active-tab {
      color: hsla(0, 100%, 65%, 1);
      background-color: white;
      outline: none;
    }
    .blocks {
      flex: 1;
      padding: 20px;
      margin-left: 12.5%;
    }
    .bottom {
      margin-top: auto;
    }
    #commitLog {
      height: 50%;
      max-height: 50%;
      padding: 0;
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
        <ul id="scripts"></ul>
        <br />
        <button onclick="document.querySelector('#commitLog').close()">
          Okay
        </button>
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

function diff(oldArray, newArray) {
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

function merge(baseArray, newArray) {
  const mergedArray = [...baseArray];

  for (const newItem of newArray) {
    if (!mergedArray.includes(newItem)) {
      mergedArray.push(newItem);
    }
  }

  return mergedArray;
}

function parseTheBlocks(oldProject, newProject, scriptNumber) {
  const oldBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(oldProject).filter((key) =>
      oldProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    oldProject,
    "en",
    {
      tabs: " ".repeat(4),
    }
  );

  const newBlocks = parseSB3Blocks.toScratchblocks(
    Object.keys(newProject).filter((key) =>
      newProject[key].opcode.startsWith("event_when")
    )[scriptNumber],
    newProject,
    "en",
    {
      tabs: " ".repeat(4),
    }
  );

  return {
    oldBlocks,
    newBlocks,
  };
}

async function showDiffs(oldProject, newProject, scriptNumber = 0) {
  await import(
    "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
  );
  await import(
    "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
  );

  const { oldBlocks, newBlocks } = parseTheBlocks(
    oldProject,
    newProject,
    scriptNumber
  );
  const oldBlocksSplit = Array.from(oldBlocks.split("\n")).map(
    (item, i) => `${i} ${item}`
  );
  const newBlocksSplit = Array.from(newBlocks.split("\n")).map(
    (item, i) => `${i} ${item}`
  );

  const difference = diff(oldBlocksSplit, newBlocksSplit);
  let merged = merge(oldBlocksSplit, newBlocksSplit);

  document.querySelector("#scripts").innerHTML = "";
  Array(
    Object.keys(newProject).filter((key) =>
      newProject[key].opcode.startsWith("event_when")
    ).length
  )
    .fill()
    .forEach((_, i) => {
      let newItem = document.createElement("li");

      let link = document.createElement("button");
      link.classList.add("tab-btn");
      link.setAttribute("script-no", i.toString());
      link.onclick = () => {
        showDiffs(oldProject, newProject, i);
      };
      link.appendChild(document.createTextNode(`Script ${i + 1}`));

      newItem.appendChild(link);
      document.querySelector("#scripts").appendChild(newItem);
    });
  try {
    document
      .querySelectorAll(".tab-btn")
      [scriptNumber].classList.add("active-tab");
  } catch {
    document
      .querySelectorAll(".tab-btn")
      [scriptNumber - 1].classList.add("active-tab");
  }

  document.querySelector("#commits").innerText = merged
    .map((item) => item.slice(2))
    .join("\n");

  const modal = document.querySelector("#commitLog");
  if (!modal.open) {
    modal.showModal();
  }

  scratchblocks.renderMatching("#commits", {
    style: "scratch3",
    scale: 0.675,
  });

  const scratch = Array.from(
    document.querySelectorAll(".scratchblocks-style-scratch3 > g > g > g")
  );

  merged.forEach((item, i) => {
    if (difference.removed.includes(item)) {
      const block = scratch[i].querySelector("path").cloneNode(true);
      block.style.fill = "red";
      block.style.opacity = "0.5";
      scratch[i].appendChild(block);
    }
  });
  merged.forEach((item, i) => {
    if (difference.added.includes(item)) {
      const block = scratch[i].querySelector("path").cloneNode(true);
      block.style.fill = "green";
      block.style.opacity = "0.5";
      scratch[i].appendChild(block);
    }
  });
}

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

        await showDiffs(oldProject, newProject);
      })();
    };
  } catch {}
}, 500);
