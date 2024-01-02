/** @file Please someone refactor this nonsense */

import { fileMenu, gitMenu, scratchAlert } from "./gui-components";
import Cmp from "./accessors";
import { html, timeAgo } from "./utils";
import { COMMIT_MODAL, DIFF_MODAL, WELCOME_MODAL } from "./modals";
import api from "./api";


function injectStyles() {
  document.head.innerHTML += html`
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
    />
    <link
      rel="stylesheet"
      type="text/css"
      href="https://cdn.jsdelivr.net/npm/toastify-js/src/toastify.min.css"
    />
  `;
  const MENU_ITEM_CSS = `
  div.${Cmp.MENU_ITEM}:has(#push-status):hover {
    cursor: pointer;
  }
  div.${Cmp.MENU_ITEM}:has(#allcommits-log):hover {
    cursor: pointer;
  }`;
  // This is kind of cursed.. lol
  document.head.innerHTML += html`<style>
    ${MENU_ITEM_CSS} .content {
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
    .sidebar li button.active-tab,
    .topbar a.active-tab {
      color: hsla(0, 100%, 65%, 1);
      background-color: white;
      outline: none;
    }
    .blocks {
      flex: 1;
      padding: 20px;
      margin-left: 12.5%;
      margin-top: 30px;
    }
    .bottom {
      margin-top: auto;
    }
    #commitLog,
    #allcommitLog,
    #welcomeLog {
      height: 50%;
      max-height: 50%;
      padding: 0;
      width: 50%;
    }
    .bottom-bar {
      position: sticky;
      width: 100%;
      display: flex;
      justify-content: space-between;
      background-color: transparent;
      padding: 10px;
      bottom: 0;
    }
    .bottom-bar select {
      font-size: 14px;
      background-color: hsla(0, 100%, 65%, 1);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
    .tab-btn {
      display: flex;
      align-items: center;
    }
    .tab-btn i {
      font-size: 17px;
      margin-right: 10px;
    }
    .scratchblocks {
      margin-left: 10px;
    }
    .dark {
      background-color: #111;
      color: #eee;
    }
    .dark #scripts li button {
      background-color: rgb(46, 46, 46);
      color: #707070;
    }
    .dark #scripts li button.active-tab {
      background-color: rgb(76, 76, 76);
      color: #eee;
    }

    .commit {
      border: 1px solid grey;
      min-width: 100%;
      padding: 10px 20px;
    }
    .commit-group .commit:first-child {
      border-radius: 5px;
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }
    .commit-group .commit:not(:first-child) {
      border-top: none;
    }
    .commit-group .commit:last-child {
      border-radius: 5px;
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }

    .topbar {
      background-color: #e6f0ff;
      overflow: hidden;
      position: sticky;
      top: 0;
      display: flex;
      position: absolute;
      margin-left: 135px;
      padding: 10px;
      border-bottom: 1px solid grey;
      width: 100%;
    }

    .topbar a {
      display: inline-block;
      padding: 0 10px;
      color: hsla(225, 15%, 40%, 0.75);
      text-decoration: none;
    }

    .dark .topbar {
      background-color: #111;
    }

    .dark .topbar a {
      color: #707070;
    }

    .dark .topbar a.active-tab {
      color: #eee;
    }

    .pagination {
      display: flex;
      justify-content: center;
    }

    .disabled-funny {
      background-color: hsla(0, 60%, 55%, 1);
      color: rgba(255, 255, 255, 0.4);
      cursor: default;
    }

    #pathInput::file-selector-button {
      display: none;
    }
  </style>`;
}


function initGitMenu() {
  console.log(document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[3]);
}


async function displayCommitsMenu() {
  const older = document.querySelector("#older");
  const newer = document.querySelector("#newer");

  function renderCommits(commits) {
    document.querySelector(".commit-group").innerHTML = commits
      .map(
        (e) => html`<div class="commit">
  <span style="font-size: 1rem">${e.subject
          }<span><br /><span style="font-size: 0.75rem"
        >${e.author.name} <span style="font-weight: lighter" title="${e.author.date
          }">commited ${timeAgo(e.author.date)}</span></span
      >
    </div>`,
      )
      .join("");
  }

  let offset = 0;
  const commits = await (await api.getCurrentProject()).getCommits();
  [...commits].forEach(
    (commit, i) => (commits[i].shortDate = commit.author.date.split(" ").slice(0, 4)),
  );
  renderCommits(commits.slice(offset, offset + 40));

  document.querySelector(".pagination").innerHTML = html`<button
      class="${Cmp.SETTINGS_BUTTON} disabled-funny"
      style="border-top-right-radius: 0px; border-bottom-right-radius: 0px;"
      id="newer"
    >
      Newer</button
    ><button
      class="${Cmp.SETTINGS_BUTTON}"
      style="border-top-left-radius: 0px; border-bottom-left-radius: 0px;"
      id="older"
    >
      Older
    </button>`;

  older.onclick = () => {
    if (older.classList.contains("disabled-funny")) return;

    offset += 40;
    renderCommits(commits.slice(offset, offset + 40));
    if (
      commits.slice(offset, offset + 40).includes(commits[commits.length - 1])
    ) {
      older.classList.add("disabled-funny");
    }
    if (commits.slice(offset, offset + 40).includes(commits[0])) {
      newer.classList.add("disabled-funny");
    } else {
      newer.classList.remove("disabled-funny");
    }
  };

  newer.onclick = () => {
    if (newer.classList.contains("disabled-funny")) return;

    offset -= 40;
    renderCommits(commits.slice(offset, offset + 40));
    if (
      !commits.slice(offset, offset + 40).includes(commits[commits.length - 1])
    ) {
      document.querySelector("#older").classList.remove("disabled-funny");
    }
    if (commits.slice(offset, offset + 40).includes(commits[0])) {
      document.querySelector("#newer").classList.add("disabled-funny");
    }
  };

  const modal = document.querySelector("#allcommitLog");
  if (!modal.open) {
    modal.showModal();
  }
  document.querySelector("#older").blur();
}


/** @todo deprecate in favor of dedicated menu */
function addGitMenuButtons() {
  setTimeout(() => {
    document.querySelector("#push-status").parentElement.parentElement.onclick = async () => {
      document.querySelector("#push-status").style.opacity = "0.5";
      document.querySelector("#push-status").querySelector("span").innerText = "Pushing project...";
      await (await api.getCurrentProject()).push();
      document.querySelector("#push-status").style.opacity = "1";
      document.querySelector("#push-status").querySelector("span").innerText = "Push project";
      scratchAlert({
        message: "Commits pushed successfully",
        duration: 5000,
      });
    };
    document.querySelector(
      "#allcommits-log",
    ).parentElement.parentElement.onclick = displayCommitsMenu;
    document.querySelectorAll(".git-button").forEach((element) => {
      element.parentElement.onmouseenter = () => {
        element.parentElement.style.backgroundColor = "var(--ui-black-transparent, hsla(0, 0%, 0%, 0.15))";
      };
      element.parentElement.onmouseleave = () => {
        element.parentElement.style.backgroundColor = document.body.getAttribute("theme") === "dark"
          ? "#333"
          : "hsla(0, 100%, 65%, 1)";
      };
    });
  }, 500);
}


export default function () {
  gitMenu.create({
    commitViewHandler: displayCommitsMenu,
  });

  const MENU = `#app > div > div.${Cmp.MENU_POSITION}.${Cmp.MENU_BAR} > div.${Cmp.MENU_CONTAINER}`;
  const SAVE_AREA = `${MENU} > div:nth-child(4)`;
  const secondCateg = document.querySelector(SAVE_AREA).cloneNode(true);
  document.querySelector(SAVE_AREA).after(secondCateg);

  injectStyles();

  document.querySelector(SAVE_AREA).innerHTML += html`<div
    class="${Cmp.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="push-status">
        <span>Push project</span>
      </div>
    </div>
  </div>`;

  secondCateg.innerHTML += html`<div
    class="${Cmp.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="allcommits-log">
        <span>Commits</span>
      </div>
    </div>
  </div>`;

  document.querySelector(SAVE_AREA).innerHTML += DIFF_MODAL + COMMIT_MODAL + WELCOME_MODAL;

  addGitMenuButtons();

  document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[1].onclick = () => {
    const isDark = document.body.getAttribute("theme") === "dark";
    document.querySelectorAll(".git-button").forEach((element) => {
      element.parentElement.style.backgroundColor = isDark
        ? "#333"
        : "hsla(0, 100%, 65%, 1)";
    });
  };

  if (!fileMenu.isProjectOpen()) {
    document.querySelector("#welcomeLog").showModal();
  }
}
