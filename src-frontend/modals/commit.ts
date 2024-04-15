import { Cmp } from "../dom/index.ts";
import api, { Commit } from "../api.ts";
import van, { State } from "../lib/van.js";

const {
  tags: { div, button, h1, br, span },
  state,
} = van;

// https://stackoverflow.com/a/69122877/16019146
export function timeAgo(input: Date | string) {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  const matched = Object.keys(ranges).find(
    (key) => ranges[key as keyof typeof ranges] < Math.abs(secondsElapsed)
  ) as keyof typeof ranges;
  return formatter.format(
    Math.round(secondsElapsed / ranges[matched]),
    matched as Intl.RelativeTimeFormatUnit
  );
}

const Commit = (commit: Commit) =>
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
  older: HTMLButtonElement;
  newer: HTMLButtonElement;
  commits: State<Commit[]>;

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("#comits")) return;
    this.commits = state<Commit[]>([]);

    const closeButton = button(
      {
        id: "closeButton",
        class: Cmp.SETTINGS_BUTTON,
        style: "margin-left: 10px",
        onclick: () => {
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
    if (
      document.querySelector<HTMLDialogElement>(
        `dialog[is="${this.getAttribute("is")}"]`
      )!.open
    )
      return;
    // directly attaching this modal to anything in #app will hide the project player
    // so apparantly moving it elsewhere fixes it :/
    const fragment = document.createDocumentFragment();
    fragment.appendChild(this);
    document.querySelector(`.${Cmp.GUI_PAGE_WRAPPER}`)!.appendChild(fragment);
    document
      .querySelector<HTMLDialogElement>(
        `dialog[is="${this.getAttribute("is")}"]`
      )!
      .showModal();
  }

  async display() {
    let page = 0;
    let commits_ = await (await api.getCurrentProject())!.getCommits();

    let commits = [...Array(Math.ceil(commits_.length / 40))].map((_) =>
      commits_.splice(0, 40)
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
