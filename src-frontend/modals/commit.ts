import { Modal } from "./base";
import api, { type Commit } from "@/api";
import { settings } from "@/components";
import { CommitItem } from "@/components";
import i18next from "@/i18n";
import van, { type State } from "vanjs-core";

const { h1, button, input, div, span, br, main } = van.tags;

const paginate = (list: any[], length: number) =>
  [...Array(Math.ceil(list.length / length))].map((_) =>
    list.splice(0, length),
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends Modal {
  private $!: {
    $older: HTMLButtonElement;
    $newer: HTMLButtonElement;
    $search: HTMLInputElement;
  };

  private state!: {
    paginatedCommits: State<Commit[]>;
    searchQuery: State<string>;
    currentPage: State<number>;
  };

  constructor() {
    super();
  }

  connectedCallback() {
    if (this.querySelector("main")) return;

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
      i18next.t("close"),
    );

    this.$ = {
      $newer: button(
        {
          class: [settings.settingsButton, "round-right-button"].join(" "),
          disabled: true,
        },
        i18next.t("commit.newer"),
      ),
      $older: button(
        {
          class: [settings.settingsButton, "round-left-button"].join(" "),
        },
        i18next.t("commit.older"),
      ),
      $search: input({
        type: "text",
        style: "border-radius: 5px; width: 50%",
        class: `${settings.inputField}${
          window.ReduxStore.getState().scratchGui.theme.theme.gui === "dark"
            ? " dark"
            : ""
        }`,
        placeholder: i18next.t("commit.search-commits"),
      }),
    };

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
        }),
      ),
    );

    van.add(
      this,
      main(
        { id: "commitList" },
        h1(i18next.t("commit.commits")),
        div(
          { class: "pagination" },
          span(this.$.$newer, this.$.$older),
          this.$.$search,
        ),
        br(),
        commitGroup,
        br(),
        div(
          {
            class: "bottom-bar",
            style: "margin: 0; padding: 0; bottom: 10px; margin-left: 10px",
          },
          closeButton,
        ),
      ),
    );
  }

  public async display() {
    let commits_ = await (await api.getCurrentProject())!.getCommits();
    const commits = paginate(commits_, 40);

    const { $newer, $older, $search } = this.$;

    this.state.paginatedCommits.val = commits[this.state.currentPage.val];

    if (commits.length === 1) {
      $newer.disabled = true;
      $older.disabled = true;
    }

    $older.onclick = () => {
      const page = ++this.state.currentPage.val;
      this.state.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state.searchQuery.val !== "" ||
              e.subject.includes(this.state.searchQuery.val),
          ),
        40,
      )[page];
      $older.disabled = page === commits.length - 1;
      $newer.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        $older.disabled = false;
        $newer.disabled = false;
      }
    };

    $newer.onclick = () => {
      const page = --this.state.currentPage.val;
      this.state.paginatedCommits.val = paginate(
        commits
          .flat()
          .filter(
            (e) =>
              this.state.searchQuery.val !== "" ||
              e.subject.includes(this.state.searchQuery.val),
          ),
        40,
      )[page];
      $newer.disabled = page === 0;
      $older.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        $older.disabled = false;
        $newer.disabled = false;
      }
    };

    $search.oninput = async (s) => {
      const search = (s.target! as any).value;
      this.state.searchQuery.val = search;
      if (search === "") {
        const page = this.state.currentPage.val;
        $newer.disabled = page === 0;
        $older.disabled = page !== 0;
        if (page !== 0 && page !== commits.length - 1) {
          $older.disabled = false;
          $newer.disabled = false;
        }
        if (commits.length === 1) {
          $older.disabled = true;
        }
        this.state.paginatedCommits.val = commits[page];
        return;
      }
      commits_ = await (await api.getCurrentProject())!.getCommits();
      this.state.paginatedCommits.val = commits_
        .flat()
        .filter((e) => e.subject.includes(search));
      $older.disabled = true;
      $newer.disabled = true;
    };

    if (!this.open) {
      this.state.currentPage.val = 0;
      this.showModal();
    }
  }
}
