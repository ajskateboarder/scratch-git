import api, { type Commit } from "@/api";
import { cls, Settings } from "@/components/accessors";
import { Redux } from "@/lib";
import van, { type State } from "vanjs-core";
import { Card } from "../card";
import { CommitItem } from "./commit-item";
import { Base } from "../base";

const { button, input, div, span, br, main, i, h3, p } = van.tags;

const paginate = (list: any[], length: number) =>
  [...Array(Math.ceil(list.length / length))].map((_) =>
    list.splice(0, length)
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends Base {
  $older = button(
    {
      class: cls(Settings.button, "round-left-button"),
    },
    i({ class: "fa-solid fa-arrow-right" })
  );

  $newer = button(
    {
      class: cls(Settings.button, "round-right-button"),
      disabled: true,
    },
    i({ class: "fa-solid fa-arrow-left" })
  );

  $search = input({
    type: "text",
    style: "border-radius: 5px; width: 50%",
    class: `${Settings.inputField}${
      (Redux.getState().scratchGui as any).theme.theme.gui === "dark"
        ? " dark"
        : ""
    }`,
    placeholder: "Search for commits",
  });

  $showing = p();

  private state: {
    paginatedCommits: State<Commit[]>;
    searchQuery: State<string>;
    currentPage: State<number>;
  } = {
    paginatedCommits: van.state([]),
    searchQuery: van.state(""),
    currentPage: van.state(0),
  };

  allCommits: Commit[] | undefined;

  connectedCallback() {
    if (this.querySelector("main")) return;
    this.close();

    const commitGroup = div(
      { class: "commit-group" },
      span(() => {
        const commits = this.state.paginatedCommits.val;
        const groups = commits.reduce((groups: Record<string, Commit[]>, e) => {
          const date = e.author.date.split(" ").slice(1, 4).join(" ");
          (groups[date] || (groups[date] = [])).push(e);
          return groups;
        }, {});
        return span(
          Object.entries(groups).map(([heading, commits]) => {
            const finalCommits = commits.map((e) => {
              if (this.state.searchQuery.val !== "") {
                if (e.subject.includes(this.state.searchQuery.val)) {
                  return CommitItem(e, this.state.searchQuery.val);
                }
              } else {
                return CommitItem(e, "");
              }
            });
            return heading !== ""
              ? span(h3(heading), span(finalCommits))
              : span(finalCommits);
          })
        );
      })
    );

    van.add(
      this,
      Card(
        main(
          { id: "commitList", style: "padding: 20px" },
          div(
            { class: "pagination" },
            span(this.$newer, this.$older),
            this.$search
          ),
          br(),
          this.$showing,
          br(),
          commitGroup
        ),
        "Commits",
        () => this.close(),
        "width: 420px; height: 20rem"
      )
    );
  }

  public async display() {
    this.allCommits = await api.getCurrentProject()?.getCommits();
    this.state.currentPage.val = 0;
    this.$newer.disabled = true;
    // for some odd reason, this.allCommits gets completely emptied if you access it
    // so as a temporary fix, we copy the commit array, which is at least better than requesting it
    let commits_ = this.allCommits?.slice()!;
    const commits = paginate(commits_, 40);

    const { $newer, $older, $search, $showing } = this;

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
              e.subject.includes(this.state.searchQuery.val)
          ),
        40
      )[page];
      $older.disabled = page === commits.length - 1;
      $newer.disabled = page !== commits.length - 1;
      if (page !== 0 && page !== commits.length - 1) {
        $older.disabled = false;
        $newer.disabled = false;
      }
      $showing.innerText = `Showing ${40 * page}-${Math.min(
        this.allCommits!.length,
        40 * page + 40
      )} of ${this.allCommits?.length}`;
    };

    $newer.onclick = () => {
      const page = --this.state.currentPage.val;
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
      $newer.disabled = page === 0;
      $older.disabled = page !== 0;
      if (page !== 0 && page !== commits.length - 1) {
        $older.disabled = false;
        $newer.disabled = false;
      }
      $showing.innerText = `Showing ${40 * page}-${40 * page + 40} of ${
        this.allCommits?.length
      }`;
    };

    $search.oninput = async (s: Event) => {
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
      commits_ = this.allCommits?.slice()!;
      this.state.paginatedCommits.val = commits_
        .flat()
        .filter((e) => e.subject.includes(search));
      $older.disabled = true;
      $newer.disabled = true;

      const commitsOnPage = Math.min(this.allCommits!.length, 40);
      const info =
        commitsOnPage === 0
          ? ""
          : ` (0-${commitsOnPage} / ${this.allCommits?.length})`;

      this.querySelector<HTMLElement>(
        ".card-title"
      )!.innerText = `Commits${info}`;
    };

    if (!this.open) {
      this.state.currentPage.val = 0;
      this.showModal();
      $search.focus();
      const commitsOnPage = Math.min(this.allCommits!.length, 40);
      const info =
        commitsOnPage === 0
          ? ""
          : ` (0-${commitsOnPage} / ${this.allCommits?.length})`;

      this.querySelector<HTMLElement>(
        ".card-title"
      )!.innerText = `Commits${info}`;
    }
  }
}
