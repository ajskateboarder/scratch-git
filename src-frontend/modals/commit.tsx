import { Cmp } from "../dom/index.ts";
import api, { type Commit } from "../api.ts";
import van, { type State } from "vanjs-core";
import { guiTheme } from "../utils.ts";

// https://stackoverflow.com/a/69122877/16019146
const timeAgo = (input: Date | string) => {
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
};

const highlight = (fullText: string, search: string) => {
  if (search !== "") {
    let text = new Option(fullText).innerHTML;
    let newText = text.replace(
      new RegExp(search.replace("+", "\\+"), "g"),
      `<mark>${search}</mark>`
    );
    return span({ innerHTML: newText });
  }
  return fullText;
};

const { div, span, br } = van.tags;

const Commit = (commit: Commit, search: string) =>
  div(
    { class: "commit" },
    span({ style: "font-size: 1rem" }, highlight(commit.subject, search)),
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

const paginate = (list: any[], length: number) =>
  [...Array(Math.ceil(list.length / length))].map((_) =>
    list.splice(0, length)
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends HTMLDialogElement {
  older?: HTMLButtonElement;
  newer?: HTMLButtonElement;
  search?: HTMLInputElement;

  state?: {
    paginatedCommits: State<Commit[]>;
    searchQuery: State<string>;
    currentPage: State<number>;
  };

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("#commitList")) return;
    this.state = {
      paginatedCommits: van.state([]),
      searchQuery: van.state(""),
      currentPage: van.state(0),
    };

    const closeButton = (
      <button
        className={Cmp.SETTINGS_BUTTON}
        style="margin-left: 10px"
        onClick={() => this.close()}
      >
        Close
      </button>
    );

    this.newer = (
      <button className={[Cmp.SETTINGS_BUTTON, "round-right-button"].join(" ")}>
        Newer
      </button>
    ) as HTMLButtonElement;

    this.newer.disabled = true;

    this.older = (
      <button className={[Cmp.SETTINGS_BUTTON, "round-left-button"].join(" ")}>
        Older
      </button>
    ) as HTMLButtonElement;

    this.search = (
      <input
        type="text"
        className={`commit-search${guiTheme().gui === "dark" ? " dark" : ""}`}
        placeholder="Search commits"
      />
    ) as HTMLInputElement;

    const commitGroup = div({ class: "commit-group" }, () =>
      span(
        this.state!.paginatedCommits.val.map((e) => {
          if (this.state!.searchQuery.val !== "") {
            if (e.subject.includes(this.state!.searchQuery.val)) {
              return Commit(e, this.state!.searchQuery.val);
            }
          } else {
            return Commit(e, "");
          }
        })
      )
    );

    van.add(
      this,
      <div id="commitList">
        <h1>Commits</h1>
        <div className="pagination">
          <span>
            {this.newer}
            {this.older}
          </span>
          {this.search}
        </div>
        <br />
        {commitGroup}
        <br />
        <div
          className="bottom-bar"
          style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px"
        >
          {closeButton}
        </div>
      </div>
    );
  }

  _showMe() {
    if (
      document.querySelector<HTMLDialogElement>(
        `dialog[is="${this.getAttribute("is")}"]`
      )!.open
    )
      return;
    this.state!.currentPage.val = 0;

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
    let commits_ = await (await api.getCurrentProject())!.getCommits();
    console.log(commits_);
    let commits = paginate(commits_, 40);

    this.state!.paginatedCommits.val = commits[this.state!.currentPage.val];

    if (commits.length === 1) {
      this.newer!.disabled = true;
      this.older!.disabled = true;
    }

    this.older!.onclick = () => {
      let page = ++this.state!.currentPage.val;
      this.state!.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state!.searchQuery.val !== "" ||
              e.subject.includes(this.state!.searchQuery.val)
          ),
        40
      )[page];
      this.older!.disabled = page === commits.length - 1;
      this.newer!.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        this.older!.disabled = false;
        this.newer!.disabled = false;
      }
    };

    this.newer!.onclick = () => {
      let page = --this.state!.currentPage.val;
      this.state!.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state!.searchQuery.val !== "" ||
              e.subject.includes(this.state!.searchQuery.val)
          ),
        40
      )[page];
      this.newer!.disabled = page === 0;
      this.older!.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        this.older!.disabled = false;
        this.newer!.disabled = false;
      }
    };

    this.search!.oninput = async (s) => {
      let search = (s.target! as any).value;
      this.state!.searchQuery.val = search;
      if (search === "") {
        let page = this.state!.currentPage.val;
        this.newer!.disabled = page === 0;
        this.older!.disabled = page !== 0;
        if (page !== 0 && page !== commits.length - 1) {
          this.older!.disabled = false;
          this.newer!.disabled = false;
        }
        this.state!.paginatedCommits.val = commits[page];
        return;
      }
      commits_ = await (await api.getCurrentProject())!.getCommits();
      this.state!.paginatedCommits.val = commits_
        .flat()
        .filter((e) => e.subject.includes(search));
      this.older!.disabled = true;
      this.newer!.disabled = true;
    };

    if (!this.open) this._showMe();
  }
}
