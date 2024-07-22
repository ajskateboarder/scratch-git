import { Modal } from "../base";
import api, { type Commit } from "@/api";
import { cls, settings } from "@/components";
import { CommitItem } from "@/components";
import i18next from "@/l10n";
import { Redux } from "@/lib";
import van, { type State } from "vanjs-core";

const { h1, button, input, div, span, br, main, i, h3, p } = van.tags;

const paginate = (list: any[], length: number) =>
  [...Array(Math.ceil(list.length / length))].map((_) =>
    list.splice(0, length)
  );

/** Displays a log of all commits to a Git project */
export class CommitModal extends Modal {
  private $!: {
    $older: HTMLButtonElement;
    $newer: HTMLButtonElement;
    $search: HTMLInputElement;
    $showing: HTMLParagraphElement;
  };

  allCommits: Commit[] | undefined;
  private state!: {
    paginatedCommits: State<Commit[]>;
    searchQuery: State<string>;
    currentPage: State<number>;
  };

  connectedCallback() {
    if (this.querySelector("main")) return;

    const closeButton = button(
      {
        class: settings.settingsButton,
        style: "margin-left: 10px",
        onclick: () => this.close(),
      },
      i({ class: "fa-solid fa-xmark" })
    );

    this.state = {
      paginatedCommits: van.state([]),
      searchQuery: van.state(""),
      currentPage: van.state(0),
    };

    this.$ = {
      $newer: button(
        {
          class: cls(settings.settingsButton, "round-right-button"),
          disabled: true,
        },
        i({ class: "fa-solid fa-arrow-left" })
      ),
      $older: button(
        {
          class: cls(settings.settingsButton, "round-left-button"),
        },
        i({ class: "fa-solid fa-arrow-right" })
      ),
      $search: input({
        type: "text",
        style: "border-radius: 5px; width: 50%",
        class: `${settings.inputField}${
          Redux.getState().scratchGui.theme.theme.gui === "dark" ? " dark" : ""
        }`,
        placeholder: i18next.t("commit.search-commits"),
      }),
      $showing: p(),
    };

    const commitGroup = div(
      { class: "commit-group" },
      span(() => {
        const commits = this.state.paginatedCommits.val;
        const groups = commits.reduce((groups: Record<string, Commit[]>, e) => {
          // TODO: make this friendlier for other languages
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
              ? span(h3(heading), finalCommits)
              : span(finalCommits);
          })
        );
      })
    );

    van.add(
      this,
      main(
        { id: "commitList" },
        h1({ class: "header" }, i18next.t("commit.commits"), closeButton),
        div(
          { class: "pagination" },
          span(this.$.$newer, this.$.$older),
          this.$.$search
        ),
        br(),
        this.$.$showing,
        br(),
        commitGroup
      )
    );
  }

  public async display() {
    this.allCommits = await api.getCurrentProject()?.getCommits();
    this.state.currentPage.val = 0;
    this.$.$newer.disabled = true;
    // for some odd reason, this.allCommits gets completely emptied if you access it
    // so as a temporary fix, we copy the commit array, which is at least better than requesting it
    let commits_ = this.allCommits?.slice()!;
    const commits = paginate(commits_, 40);

    const { $newer, $older, $search, $showing } = this.$;

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
      commits_ = this.allCommits?.slice()!;
      this.state.paginatedCommits.val = commits_
        .flat()
        .filter((e) => e.subject.includes(search));
      $older.disabled = true;
      $newer.disabled = true;
      $showing.innerText = `Showing ${commits_.length} of ${this.allCommits?.length}`;
    };

    const header = this.querySelector(".header") as HTMLDivElement;
    const closeButton = header.querySelector("button") as HTMLButtonElement;

    this.onscroll = () => {
      if (this.scrollTop > 50) {
        header.style.fontSize = "20px";
        closeButton.style.scale = "0.8";
      } else {
        header.setAttribute("style", "");
        closeButton.setAttribute("style", "");
      }
    };

    if (!this.open) {
      this.state.currentPage.val = 0;
      this.showModal();
      $search.focus();
      $showing.innerText = `Showing 0-40 of ${this.allCommits?.length}`;
    }
  }
}
