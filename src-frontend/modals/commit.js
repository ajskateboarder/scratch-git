import { Cmp } from "../dom/index";
import api from "../api";
import { html, timeAgo } from "../utils";
import van from "../lib/van";

const {
  tags: { div, button, h1, br, span },
  state,
} = van;

/** @param {import("../api").Commit} commit */
const Commit = (commit) =>
  div(
    { class: "commit" },
    span({ style: "font-size: 1rem" }, commit.subject),
    br(),
    span(
      { style: "font-size: 0.75rem" },
      commit.author.name,
      span(
        { style: "font-weight: lighter", title: commit.author.date },
        ` commited ${timeAgo(commit.author.date)}`
      )
    )
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends HTMLDialogElement {
  /** @type {HTMLButtonElement} */
  older;
  /** @type {HTMLButtonElement} */
  newer;
  /** @type {import("../lib/van").State<import("../api").Commit[]>} */
  commits;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("#comits")) return;
    const closeButton = button(
      {
        id: "closeButton",
        class: Cmp.SETTINGS_BUTTON,
        style: "margin-left: 10px",
        onclick: () => {
          useHighlights.checked = false;
          plainText.checked = false;
          this.close();
        },
      },
      "Okay"
    );

    this.newer = button(
      {
        className: Cmp.SETTINGS_BUTTON,
        style: `
    border-top-left-radius: 0px;
    border-bottom-left-radius: 0px;
    user-select: none
    `,
      },
      "Newer"
    );
    this.older = button(
      {
        className: Cmp.SETTINGS_BUTTON,
        style: `
    border-top-right-radius: 0px;
    border-bottom-right-radius: 0px;
    user-select: none
    `,
      },
      "Older"
    );
    this.commits = state([]);

    van.add(
      this,
      div(
        {
          style: `
      position: absolute;
      left: 47%;
      transform: translateX(-50%);
      width: 65%;
    `,
          id: "comits",
        },
        h1("Commits"),
        div({ class: "pagination" }, this.older, this.newer),
        br(),
        div({ class: "commit-group" }, () =>
          span(this.commits.val.map((e) => Commit(e)))
        ),
        br(),
        div(
          {
            class: "bottom-bar",
            style: `
        margin: 0;
        padding: 0;
        bottom: 10px;
        margin-left: 10px;
      `,
          },
          closeButton
        )
      )
    );
  }

  _showMe() {
    if (document.querySelector(`dialog[is="${this.getAttribute("is")}"]`).open)
      return;
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
    let page = 0;
    let commits = await (await api.getCurrentProject()).getCommits();

    commits = [...Array(Math.ceil(commits.length / 40))].map((_) =>
      commits.splice(0, 40)
    );
    this.commits.val = commits[page];

    if (commits.length === 1) {
      this.newer.disabled = true;
      this.older.disabled = true;
    }

    this.older.onclick = () => {
      this.commits.val = commits[++page];
      this.older.disabled = page === commits.length - 1;
      this.newer.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    this.newer.onclick = () => {
      this.commits.val = commits[--page];
      this.newer.disabled = page === 0;
      this.older.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    if (!this.open) this._showMe();
  }
}
