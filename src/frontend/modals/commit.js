/** @file Template and logic for the commit modal */

import Cmp from "../accessors";
import api from "../api";
import { html, timeAgo } from "../utils";

const COMMIT_MODAL = html`<dialog
  id="commitModal"
  style="overflow-x: hidden; overflow-y: auto"
>
  <div
    style="
position: absolute;
left: 47%;
transform: translateX(-50%);
width: 65%;
"
  >
    <h1>Commits</h1>
    <div class="pagination"></div>
    <br />
    <div class="commit-group"></div>
    <div
      class="bottom-bar"
      style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
    >
      <button
        onclick="document.querySelector('#commitModal').close()"
        class="${Cmp.SETTINGS_BUTTON}"
        id="commitButton"
      >
        Okay
      </button>
    </div>
  </div>
</dialog>`;

/** Appends a commit modal to the DOM and becomes display-able */
export class CommitModal {
  constructor(root) {
    root.innerHTML += COMMIT_MODAL;

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
  }

  /** @returns {HTMLDialogElement} */
  get modal() {
    return document.querySelector("#commitModal");
  }

  async display() {
    /** @type {HTMLButtonElement} */
    const older = this.modal.querySelector("#older");
    /** @type {HTMLButtonElement} */
    const newer = this.modal.querySelector("#newer");

    function renderCommits(commits) {
      document.querySelector(".commit-group").innerHTML = commits
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
    }

    let offset = 0;
    let commits = await (await api.getCurrentProject()).getCommits();

    [...commits].forEach(
      (commit, i) =>
        (commits[i].shortDate = commit.author.date.split(" ").slice(0, 4))
    );
    renderCommits(commits.slice(offset, offset + 40));

    /** @param {HTMLButtonElement} button */
    const enable = (button) => {
      button.classList.remove("disabled-funny");
      button.disabled = false;
    };

    /** @param {HTMLButtonElement} button */
    const disable = (button) => {
      button.classList.add("disabled-funny");
      button.disabled = true;
    };

    const toggle = (button, condition) => {
      condition ? enable(button) : disable(button);
    };

    older.onclick = () => {
      if (older.classList.contains("disabled-funny")) return;

      offset += 40;
      renderCommits(commits.slice(offset, offset + 40));

      if (
        !commits
          .slice(offset, offset + 40)
          .includes(commits[commits.length - 1])
      )
        disable(older);

      toggle(newer, commits.slice(offset, offset + 40).includes(commits[0]));
    };

    newer.onclick = () => {
      if (newer.classList.contains("disabled-funny")) return;

      offset -= 40;
      renderCommits(commits.slice(offset, offset + 40));
      // toggle(
      //   older,
      //   commits.slice(offset, offset + 40).includes(commits[commits.length - 1])
      // );
      // toggle(newer, !commits.slice(offset, offset + 40).includes(commits[0]));
      if (
        !commits
          .slice(offset, offset + 40)
          .includes(commits[commits.length - 1])
      )
        enable(older);
      if (commits.slice(offset, offset + 40).includes(commits[0]))
        disable(newer);
    };

    this.modal.showModal();
    document.querySelector("#older").blur();
  }
}
