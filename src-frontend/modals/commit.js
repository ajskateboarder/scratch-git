import { Cmp } from "../dom/index";
import api from "../api";
import { html, timeAgo } from "../utils";

/** Displays a log of all commits to a Git project */
export class CommitModal extends HTMLDialogElement {
  /** @type {HTMLButtonElement} */
  closeButton;
  /** @type {HTMLButtonElement} */
  older;
  /** @type {HTMLButtonElement} */
  newer;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("#comits")) return;
    this.innerHTML += html`<div
      style="
position: absolute;
left: 47%;
transform: translateX(-50%);
width: 65%;
"
      id="comits"
    >
      <h1>Commits</h1>
      <div class="pagination"></div>
      <br />
      <div class="commit-group"></div>
      <div
        class="bottom-bar"
        style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
      ></div>
    </div>`;
    this.closeButton = Object.assign(document.createElement("button"), {
      id: "commitButton",
      innerText: "Close",
      className: Cmp.SETTINGS_BUTTON,
    });
    this.querySelector(".bottom-bar")?.appendChild(this.closeButton);
    this.newer = Object.assign(document.createElement("button"), {
      className: `${Cmp.SETTINGS_BUTTON}`,
      style:
        "border-top-right-radius: 0px; border-bottom-right-radius: 0px; user-select: none",
      innerText: "Newer",
    });
    this.querySelector(".pagination").appendChild(this.newer);
    this.older = Object.assign(document.createElement("button"), {
      className: `${Cmp.SETTINGS_BUTTON}`,
      style:
        "border-top-left-radius: 0px; border-bottom-left-radius: 0px; user-select: none",
      innerText: "Older",
    });
    this.querySelector(".pagination").appendChild(this.older);
  }

  _showMe() {
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`).appendChild(fragment);
    document
      .querySelector(`dialog[is="${this.getAttribute("is")}"]`)
      .showModal();
  }

  async display() {
    console.log("hi");
    const renderCommits = (commits) => {
      this.querySelector(".commit-group").innerHTML = commits
        .map(
          (e) => html`<div class="commit">
      <span style="font-size: 1rem">${
        e.subject
      }<span><br /><span style="font-size: 0.75rem"
            >${e.author.name} <span style="font-weight: lighter" title="${
            e.author.date
          }">commited ${timeAgo(e.author.date)}</span></span
          >
        </div>`
        )
        .join("");
    };
    let page = 0;
    let commits = await (await api.getCurrentProject()).getCommits();
    console.log(commits);
    commits = [...Array(Math.ceil(commits.length / 40))].map((_) =>
      commits.splice(0, 40)
    );

    renderCommits(commits[page]);

    if (commits.length === 1) {
      this.newer.disabled = true;
      this.older.disabled = true;
    }

    this.older.onclick = () => {
      page += 1;
      renderCommits(commits[page]);
      this.older.disabled = page === commits.length - 1;
      this.newer.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    this.newer.onclick = () => {
      page -= 1;
      renderCommits(commits[page]);
      this.newer.disabled = page === 0;
      this.older.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    this.closeButton.onclick = () => {
      this.close();
    };

    if (!this.open) {
      this._showMe();
      this.older.blur();
    }
  }
}
