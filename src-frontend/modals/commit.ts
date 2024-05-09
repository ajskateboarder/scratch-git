import api, { type Commit } from "@/api";
import { settings } from "@/components";
import van, { type State } from "vanjs-core";
import { CommitItem } from "@/components";

const { h1, button, input, div, span, br } = van.tags;

const paginate = (list: any[], length: number) =>
  [...Array(Math.ceil(list.length / length))].map((_) =>
    list.splice(0, length)
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends HTMLDialogElement {
  older!: HTMLButtonElement;
  newer!: HTMLButtonElement;
  search!: HTMLInputElement;

  state!: {
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

    const closeButton = button(
      {
        class: settings.settingsButton,
        style: "margin-left: 10px",
        onclick: () => this.close(),
      },
      "Close"
    );

    this.newer = button(
      {
        class: [settings.settingsButton, "round-right-button"].join(" "),
        disabled: true,
      },
      "< Newer"
    );

    this.older = button(
      {
        class: [settings.settingsButton, "round-left-button"].join(" "),
      },
      "Older >"
    );

    this.search = input({
      type: "text",
      class: `commit-search${
        window.ReduxStore.getState().scratchGui.theme.theme.gui === "dark"
          ? " dark"
          : ""
      }`,
      placeholder: "Search commits",
    });

    const commitGroup = div({ class: "commit-group" }, () =>
      span(
        this.state.paginatedCommits.val.map((e) => {
          if (this.state.searchQuery.val !== "") {
            if (e.subject.includes(this.state.searchQuery.val)) {
              return CommitItem(e, this.state.searchQuery.val);
            }
          } else {
            return CommitItem(e, "");
          }
        })
      )
    );

    van.add(
      this,
      div(
        { id: "commitList" },
        h1("Commits"),
        div({ class: "pagination" }, span(this.newer, this.older), this.search),
        br(),
        commitGroup,
        br(),
        div(
          {
            class: "bottom-bar",
            style: "margin: 0; padding: 0; bottom: 10px; margin-left: 10px",
          },
          closeButton
        )
      )
    );
  }

  async display() {
    let commits_ = await (await api.getCurrentProject())!.getCommits();
    let commits = paginate(commits_, 40);

    this.state.paginatedCommits.val = commits[this.state.currentPage.val];

    if (commits.length === 1) {
      this.newer.disabled = true;
      this.older.disabled = true;
    }

    this.older.onclick = () => {
      let page = ++this.state.currentPage.val;
      this.state.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state.searchQuery.val !== "" ||
              e.subject.includes(this.state.searchQuery.val)
          ),
        40
      )[page];
      this.older.disabled = page === commits.length - 1;
      this.newer.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    this.newer.onclick = () => {
      let page = --this.state.currentPage.val;
      this.state.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state.searchQuery.val !== "" ||
              e.subject.includes(this.state.searchQuery.val)
          ),
        40
      )[page];
      this.newer.disabled = page === 0;
      this.older.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        this.older.disabled = false;
        this.newer.disabled = false;
      }
    };

    this.search.oninput = async (s) => {
      let search = (s.target! as any).value;
      this.state.searchQuery.val = search;
      if (search === "") {
        let page = this.state.currentPage.val;
        this.newer.disabled = page === 0;
        this.older.disabled = page !== 0;
        if (page !== 0 && page !== commits.length - 1) {
          this.older.disabled = false;
          this.newer.disabled = false;
        }
        this.state.paginatedCommits.val = commits[page];
        return;
      }
      commits_ = await (await api.getCurrentProject())!.getCommits();
      this.state.paginatedCommits.val = commits_
        .flat()
        .filter((e) => e.subject.includes(search));
      this.older.disabled = true;
      this.newer.disabled = true;
    };

    if (!this.open) {
      this.state.currentPage.val = 0;
      this.showModal();
    }
  }
}
