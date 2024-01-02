(function () {
  'use strict';

  // https://stackoverflow.com/a/69122877/16019146
  function timeAgo(input) {
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
    for (let key in ranges) {
      if (ranges[key] < Math.abs(secondsElapsed)) {
        const delta = secondsElapsed / ranges[key];
        return formatter.format(Math.round(delta), key);
      }
    }
  }


  function html$1(strings, ...values) {
    let result = strings[0];
    values.forEach((e, i) => {
      result += e + strings[i + 1];
    });
    return result;
  }

  /** @file A lookup to create elements using scratch-gui classnames */


  const defined = (e) => e !== undefined;


  /** @type {string[]} */
  const classNames = [
    ...[...document.styleSheets].map((e) => {
      return Object.hasOwn(e, "cssRules") ? e.cssRules : undefined;
    }),
  ]
    .filter(defined)
    .map((e) => Array.from(e))
    .flatMap((e) => e)
    .map((e) => e.selectorText)
    .filter(defined)
    .map((e) => e.slice(1));


  const select = (className) =>
    classNames.filter((e) => e.includes(className))[0];


  /**
   * Accessors for parts of the UI
   * @enum
   */
  const Cmp$1 = {
    // menu
    MENU_CONTAINER: select("menu-bar_main-menu"),
    MENU_BAR: select("menu-bar_menu-bar"),
    MENU_POSITION: select("gui_menu-bar-position"),
    MENU_ITEM: select("menu-bar_menu-bar-item"),
    MENU_ITEM_ACTIVE: select("menu-bar_active").split(",")[0].split(".")[1],
    MENU_ACCOUNTINFOGROUP: select("menu-bar_account-info-group"),
    MENU_SECTION: select("menu_menu-section"),

    // alerts
    ALERT_CONTAINER: select("alerts_alerts-inner-container"),
    ALERT_DIALOG: select("alert_alert"),
    ALERT_SUCCESS: select("alert_success").split(".")[1],
    ALERT_MESSAGE: select("alert_alert-message"),
    ALERT_BUTTONS: select("alert_alert-buttons"),
    ALERT_CLOSE_CONTAINER: select("alert_alert-close-button-container"),
    ALERT_CLOSE_BUTTON: select("alert_alert-close-button"),

    // misc
    SAVE_STATUS: select("save-status_save-now"),
    BOX: select("box_box"),
    SETTINGS_BUTTON: select("settings-modal_button"),
    CLOSE_BUTTON: select("close-button_close-button"),
    CLOSE_BUTTON_LARGE: select("close-button_large").split(".")[1].split(":")[0],
    CLOSE_ICON: select("close-button_close-icon"),
    DISABLED_BUTTON: select("button_mod-disabled"),
  };

  /**
   * @typedef GitMenuFunctions
   * @property {() => any} pushHandler
   * @property {() => any} repoLocationHandler
   * @property {() => any} ghTokenHandler
   * @property {() => any} commitViewHandler
   */


  class FileMenu {
    constructor() {
      this.menu = document.querySelectorAll(`div.${Cmp$1.MENU_ITEM}`)[2];
      this.reactEventHandlers = Object.keys(this.menu).filter((e) => e.startsWith('__reactEventHandlers'))[0];
    }

    openProject() {
      this.menu[this.reactEventHandlers].onMouseUp();
      const loadFromComputer = this.menu.querySelectorAll('li')[2];
      loadFromComputer[this.reactEventHandlers].onClick();
      this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
    }

    isProjectOpen() {
      this.menu[this.reactEventHandlers].onMouseUp();
      const savedMenu = new DOMParser().parseFromString(
        this.menu.innerHTML,
        'text/html',
      );
      this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
      return savedMenu.querySelectorAll('li')[3].innerText.endsWith('.sb3');
    }
  }


  /** Git menu instantiator from Edit menu */
  class GitMenu {
    constructor() {
      this.menu = document.querySelectorAll(`div.${Cmp$1.MENU_ITEM}`)[2];
      this.reactEventHandlers = Object.keys(this.menu).filter((e) => e.startsWith('__reactEventHandlers'))[0];
      /** @type {HTMLElement} */
      this.savedItems = undefined;
      /** @type {HTMLElement} */
      this.newMenu = undefined;
      this.open = false;
    }

    /** @param {number?} index */
    item(index = 1) {
      const li = this.savedItems.querySelectorAll('li')[index - 1];
      return {
        label: (text) => {
          try {
            li.querySelector('span').innerText = text;
          } catch (e) {
            li.innerText = text;
          }
        },
        remove: () => li.remove(),
        onclick: (handler) => {
          li.onclick = () => {
            this.newMenu.classList.remove(Cmp$1.MENU_ITEM_ACTIVE);
            this.savedItems.style.display = 'none';
            this.open = false;
            handler();
          };
        },
      };
    }

    /**
     * Copy the File nav menu and edit it to become a Git one
     * @param {GitMenuFunctions}
     */
    create({
      pushHandler,
      repoLocationHandler,
      ghTokenHandler,
      commitViewHandler,
    }) {
      // open, copy, and edit the file menu
      this.menu[this.reactEventHandlers].onMouseUp();
      this.newMenu = this.menu.cloneNode(true);
      this.menu.after(this.newMenu);
      this.newMenu.classList.remove(Cmp$1.MENU_ITEM_ACTIVE);
      this.newMenu.querySelector('span').innerText = 'Git';
      this.savedItems = this.newMenu
        .querySelector('ul')
        .parentElement.cloneNode(true);
      this.savedItems.classList.add('git-menu');
      this.newMenu.querySelector('ul').parentElement.remove();
      this.savedItems.style.display = 'none';
      this.newMenu.appendChild(this.savedItems);

      this.item(1).label('Push project');
      this.item(1).onclick(pushHandler);
      this.item(2).label('Configure repository');
      this.item(2).onclick(repoLocationHandler);
      this.item(3).elem.classList.remove(Cmp$1.MENU_SECTION);
      this.item(3).label('Configure GitHub token');
      this.item(3).onclick(ghTokenHandler);
      this.item(4).remove();
      this.item(5).remove();
      this.item(4).remove();
      this.item(4).label('View commits');
      this.item(4).onclick(commitViewHandler);

      // make new menu toggle-able
      this.newMenu.onclick = () => {
        if (this.savedItems.style.display === 'none') {
          this.newMenu.classList.add(Cmp$1.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = 'block';
          this.open = true;
        } else {
          this.newMenu.classList.remove(Cmp$1.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = 'none';
          this.open = false;
        }
      };

      // close new menu upon clicking anywhere outside of the menu
      document.querySelector('#app').onmouseup = (e) => {
        /** @type {Event} */
        const event = e;
        if (
          event.target !== this.newMenu
          && event.target.parentNode !== this.newMenu
          && this.open
        ) {
          this.newMenu.classList.remove(Cmp$1.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = 'none';
          this.open = false;
        }
      };
    }
  }


  class Alert {
    static CLOSE_BUTTON_SVG = 'data:image/svg+xml;base64, \
  PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d \
  3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdH \
  lsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO \
  3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVm \
  cz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc \
  0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT \
  0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg==';

    /** @param {{message: string; duration: number}} */
    constructor({ message, duration }) {
      this.message = message;
      this.duration = duration;
    }

    display() {
      document.querySelector(`.${Cmp$1.ALERT_CONTAINER}`).innerHTML = html$1`<div
      class="${Cmp$1.ALERT_DIALOG} ${Cmp$1.ALERT_SUCCESS} ${Cmp$1.BOX}"
      style="justify-content: space-between"
    >
      <div class="${Cmp$1.ALERT_MESSAGE}">${this.message}</div>
      <div class="${Cmp$1.ALERT_BUTTONS}">
        <div class="${Cmp$1.ALERT_CLOSE_CONTAINER} ${Cmp$1.BOX}">
          <div
            aria-label="Close"
            class="${Cmp$1.CLOSE_BUTTON} ${Cmp$1.CLOSE_BUTTON_LARGE}"
            role="button"
            tabindex="0"
          >
            <img
              class="${Cmp$1.CLOSE_ICON} undefined"
              src="${Alert.CLOSE_BUTTON_SVG}"
            />
          </div>
        </div>
      </div>
    </div>`;

      if (document.querySelector('body').getAttribute('theme') === 'dark') {
        document.querySelector(`.${Cmp$1.CLOSE_BUTTON}`).style.backgroundColor = 'rgba(0, 0, 0, 0.255)';
      }
      document.querySelector(`.${Cmp$1.CLOSE_BUTTON}`).onclick = this.remove;
      setTimeout(this.remove, this.duration);
    }

    remove() {
      document.querySelector(`.${Cmp$1.ALERT_CONTAINER}`).innerHTML = '';
    }
  }


  /** @param {{message: string; duration: number}} */
  function scratchAlert({ message, duration }) {
    new Alert({ message, duration }).display();
  }


  const fileMenu = new FileMenu();
  const gitMenu = new GitMenu();

  /** @file A tiny wrapper over the local APIs to work with Git projects */


  /**
   * @typedef Commit
   * @property {{date: string; email: string; name: string}} author
   * @property {string} body
   * @property {string} commit
   * @property {string} subject
   * @property {string} shortDate
   */


  class Project {
    #portNumber;

    /** @param {string} project */
    constructor(project, portNumber = 6969) {
      this.project = project;
      this.#portNumber = portNumber;
    }

    async _request(path) {
      return await fetch(
        `http://localhost:${this.#portNumber}/${this.project}${path}`
      );
    }

    /** @returns {Promise<Commit[]>} */
    async getCommits() {
      let commits = await (await this._request("/commits")).json();
      [...commits].forEach(
        (commit, i) =>
          (commits[i].shortDate = commit.author.date.split(" ").slice(0, 4))
      );
      return commits;
    }

    /** Retreive sprites that have been changed since project changes */
    async getSprites() {
      return (await (await this._request("/sprites")).json()).sprites;
    }

    /** @param {string} sprite */
    async getCurrentScripts(sprite) {
      return await (await this._request(`/project.json?name=${sprite}`)).json();
    }

    /** @param {string} sprite */
    async getPreviousScripts(sprite) {
      return await (
        await this._request(`/project.old.json?name=${sprite}`)
      ).json();
    }

    async commit() {
      return await (await this._request("/commit")).text();
    }

    async push() {
      await this._request("/push");
    }

    async unzip() {
      await this._request("/unzip");
    }
  }


  // class factory jumpscare
  class ProjectManager {
    #portNumber;

    /** @param {number} portNumber */
    constructor(portNumber) {
      this.#portNumber = portNumber;
    }

    /**
     * @param {string} projectName
     * @returns {Promise<Project>}
     */
    async getProject(projectName) {
      return new Project(projectName, this.#portNumber);
    }

    /**
     * Create and git-init a new project
     * @param {string} projectPath
     * @returns {Promise<Project>}
     */
    async createProject(projectPath) {
      let response = await (
        await fetch(
          `http://localhost:${this.#portNumber
        }/create_project?file_name=${projectPath}`
        )
      ).json();
      return new Project(response.project_name, this.#portNumber);
    }

    /**
     * Get the current project based on the project name
     * @returns {Promise<Project | undefined>}
     */
    async getCurrentProject() {
      let projectName = document.querySelectorAll(`.${Cmp$1.MENU_ITEM}`)[7]
        .children[0].value;
      return new Project(projectName, this.#portNumber);
    }
  }


  var api$1 = new ProjectManager(6969);

  function showDiffs (oldProject, newProject, scriptNumber) {
    const oldBlocks = parseSB3Blocks.toScratchblocks(
      Object.keys(oldProject).filter((key) =>
        oldProject[key].opcode.startsWith("event_when")
      )[scriptNumber],
      oldProject,
      "en",
      {
        tabs: "",
      }
    );

    const newBlocks = parseSB3Blocks.toScratchblocks(
      Object.keys(newProject).filter((key) =>
        newProject[key].opcode.startsWith("event_when")
      )[scriptNumber],
      newProject,
      "en",
      {
        tabs: "",
      }
    );

    return {
      oldBlocks,
      newBlocks,
    };
  }

  const DIFF_MODAL = html$1`<dialog
  id="diffModal"
  style="overflow-x: hidden"
>
  <div class="content">
    <div class="topbar"></div>
    <div class="sidebar">
      <ul id="scripts"></ul>
      <br />
    </div>
    <div class="blocks">
      <p id="commits"></p>
      <div
        class="bottom-bar"
        style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
      >
        <select id="styleChoice">
          <option value="scratch3">Scratch 3.0</option>
          <option value="scratch2">Scratch 2.0</option>
          <option value="scratch3-high-contrast">
            Scratch 3.0 (High Contrast)
          </option>
        </select>
        <button
          onclick="document.querySelector('#diffModal').close()"
          class="${Cmp$1.SETTINGS_BUTTON}"
          id="commitButton"
        >
          Okay
        </button>
      </div>
    </div>
  </div>
</dialog>`;


  class DiffModal {
    /** @type {HTMLDialogElement} */
    #modal
    /** @type {HTMLSelectElement} */
    #style

    constructor() {
      document.body.innerHTML += DIFF_MODAL;
      this.#modal = document.querySelector("#diffModal");

      this.#style = document.querySelector("#styleChoice");
      this.#style.onchange = () => {
        (async () => { await this._rerender(this.#style.value); })();
      };
    }

    async display() {
      let project = await api.getCurrentProject();
      await project.unzip();

      globalThis.sprites = await project.getSprites();

      this.#style.value = "scratch3";

      await showDiffs({
        modalElement: this.#modal,
        styleElement: this.#style,
        sprite: globalThis.sprites[0],
        style
      });
    }

    async _rerender(style) {
      const activeButton = parseInt(
        document
          .querySelector("button.tab-btn.active-tab")
          .getAttribute("script-no")
      );
      await globalThis.diffs[activeButton].renderBlocks(style);
    }
  }


  var diff = new DiffModal();

  /** @file Template and logic for the commit modal */



  const COMMIT_MODAL = html$1`<dialog
  id="commitModal"
  style="overflow-x: hidden"
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
        class="${Cmp$1.SETTINGS_BUTTON}"
        id="commitButton"
      >
        Okay
      </button>
    </div>
  </div>
</dialog>`;


  /** Appends a commit modal to the DOM and becomes display-able */
  class CommitModal {
    #modal

    constructor() {
      document.body.innerHTML += COMMIT_MODAL;
      this.#modal = document.querySelector("#commitModal");
    }

    async display() {
      const older = document.querySelector("#older");
      const newer = document.querySelector("#newer");

      function renderCommits(commits) {
        document.querySelector(".commit-group").innerHTML = commits
          .map(
            (e) => html$1`<div class="commit">
      <span style="font-size: 1rem">${e.subject}<span><br /><span style="font-size: 0.75rem"
            >${e.author.name} <span style="font-weight: lighter" title="${e.author.date}">commited ${timeAgo(e.author.date)}</span></span
          >
        </div>`
          )
          .join("");
      }

      let offset = 0;
      const commits = await (await api$1.getCurrentProject()).getCommits();
      [...commits].forEach(
        (commit, i) => (commits[i].shortDate = commit.author.date.split(" ").slice(0, 4))
      );
      renderCommits(commits.slice(offset, offset + 40));

      document.querySelector(".pagination").innerHTML = html$1`<button
          class="${Cmp$1.SETTINGS_BUTTON} disabled-funny"
          style="border-top-right-radius: 0px; border-bottom-right-radius: 0px;"
          id="newer"
        >
          Newer</button
        ><button
          class="${Cmp$1.SETTINGS_BUTTON}"
          style="border-top-left-radius: 0px; border-bottom-left-radius: 0px;"
          id="older"
        >
          Older
        </button>`;

      older.onclick = () => {
        if (older.classList.contains("disabled-funny")) return;

        offset += 40;
        renderCommits(commits.slice(offset, offset + 40));
        if (commits.slice(offset, offset + 40).includes(commits[commits.length - 1])) {
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
        if (!commits.slice(offset, offset + 40).includes(commits[commits.length - 1])) {
          older.classList.remove("disabled-funny");
        }
        if (commits.slice(offset, offset + 40).includes(commits[0])) {
          newer.classList.add("disabled-funny");
        }
      };

      if (!this.#modal.open) {
        this.#modal.showModal();
      }
      document.querySelector("#older").blur();
    }
  }


  var commit = new CommitModal();

  /** @file Template and logic for the project initialization modal */


  const DIALOG_CSS = `
  position: absolute;
  transform: translateX(-50%);
  width: 100%;
  left: 50%;
  text-align: center;
  max-height: 100%;
  overflow: hidden;
  word-wrap: break-word;
  white-space: normal;
  padding: 20px;
  box-sizing: border-box;
`;


  const WELCOME_MODAL_STEP_1 = (disabled) => html`<div style="${DIALOG_CSS}">
  <h1>Welcome</h1>
  <div style="font-weight: normal">
    <p>Please load a project for Git development<br /><br /></p>
    <button
      id="openProject"
      style="width: 50%"
      class="${Cmp.SETTINGS_BUTTON}"
    >
      Open project</button
    ><br /><br />
    <!-- TODO: make functional vv -->
    <input type="checkbox" name="dontshowagain" />
    <label for="dontshowagain"> Don't show again</label>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        onclick="document.querySelector('#welcomeModal').close()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Close
      </button>
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${disabled ? Cmp.DISABLED_BUTTON : ""}"
        ${disabled ? "disabled" : ""}
        id="goToStep2"
      >
        Next
      </button>
    </div>
  </div>
</div>`;


  const WELCOME_MODAL_STEP_2 = html`
  <div style="${DIALOG_CSS}">
    <h1>Configure project location</h1>
    <div style="font-weight: normal">
      <p>
        Please enter the full path to your project. This is so scratch.git can
        find your project locally to use with your repository<br /><br />
      </p>
      <input
        id="openProjectPath"
        type="file"
        class="${Cmp.SETTINGS_BUTTON}"
        accept=".sb,.sb2,.sb3"
      />
    </div>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
        id="gotoStep1"
      >
        Back
      </button>
      <button
        id="goToStep3"
        onclick="modalSteps.goToStep3()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
      >
        Next
      </button>
    </div>
  </div>
`;


  const WELCOME_MODAL_STEP_3 = html`
  <div style="${DIALOG_CSS}">
    <h1>Finish</h1>
    <div style="font-weight: normal">
      <p>Err IDK<br /><br /></p>
    </div>
    <div
      class="bottom-bar"
      style="justify-content: center; gap: 20px; width: 97.5%"
    >
      <button
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
        onclick="document.querySelector('#welcomeModal').close()"
      >
        Close
      </button>
    </div>
  </div>
`;


  const WELCOME_MODAL = html`<dialog
  id="welcomeModal"
  style="overflow-x: hidden"
>
  ${WELCOME_MODAL_STEP_1(true)}
</dialog>`;

  class WelcomeModal {
    #modal

    constructor() {
      document.body.innerHTML += WELCOME_MODAL;
      this.#modal = document.querySelector("#welcomeModal");
      document.querySelector("#openProject").onclick = this.openProject;
      document.querySelector("#openProjectPath").onclick = this.openProjectPath;
      document.querySelector("#goToStep1").onclick = this.goToStep1;
      document.querySelector("#goToStep2").onclick = this.goToStep2;
      document.querySelector("#goToStep3").onclick = () => this.goToStep3(document.querySelector('#pathInput').files[0].path);
    }

    display() {
      if (!this.#modal.open) {
        this.#modal.showModal();
      }
    }

    goToStep1() {
      this.#modal.innerHTML = WELCOME_MODAL_STEP_1(false);
    }

    goToStep2() {
      this.#modal.innerHTML = WELCOME_MODAL_STEP_2;
    }

    goToStep3(path) {
      (async () => {
        await API.createProject(path);
        this.#modal.innerHTML = WELCOME_MODAL_STEP_3;
      })();
    }

    openProjectPath() {
      document
        .querySelector("#nextButton2")
        .classList.remove(Cmp.DISABLED_BUTTON);
    }

    openProject() {
      fileMenu.openProject();
      /** @type {HTMLButtonElement} */
      let nextButton = document.querySelector("#nextButton");
      nextButton.disabled = false;
      nextButton.classList.remove(Cmp.DISABLED_BUTTON);
    }
  }


  var welcome = new WelcomeModal();

  var styles = ".content {\n  display: flex;\n}\n\n.sidebar {\n  width: fit-content;\n  position: fixed;\n  top: 25%;\n  height: 50%;\n  padding-right: 5px;\n  border-right: 1px solid grey;\n  background-color: #e6f0ff;\n  overflow: auto;\n}\n\n.sidebar ul {\n  list-style-type: none;\n  margin: 0;\n  padding: 0;\n}\n\n.sidebar li {\n  list-style-type: none;\n}\n\n.sidebar li button {\n  padding: 15px 30px;\n  border: 0.5px solid grey;\n  background-color: #d9e3f2;\n  color: hsla(225, 15%, 40%, 0.75);\n  transition: 0.2s background-color ease-in;\n  margin-top: 10px;\n  border-top-right-radius: 10px;\n  border-bottom-right-radius: 10px;\n}\n\n.sidebar li button:hover {\n  background-color: #ccd3dd;\n}\n\n.sidebar li button.active-tab,\n.topbar a.active-tab {\n  color: hsla(0, 100%, 65%, 1);\n  background-color: white;\n  outline: none;\n}\n\n.blocks {\n  flex: 1;\n  padding: 20px;\n  margin-left: 12.5%;\n  margin-top: 30px;\n}\n\n.bottom {\n  margin-top: auto;\n}\n\n#diffModal,\n#commitModal,\n#welcomeModal {\n  height: 50%;\n  max-height: 50%;\n  padding: 0;\n  width: 50%;\n}\n\n.bottom-bar {\n  position: sticky;\n  width: 100%;\n  display: flex;\n  justify-content: space-between;\n  background-color: transparent;\n  padding: 10px;\n  bottom: 0;\n}\n\n.bottom-bar select {\n  font-size: 14px;\n  background-color: hsla(0, 100%, 65%, 1);\n  color: white;\n  border: none;\n  padding: 0.5rem 1rem;\n  border-radius: 4px;\n  cursor: pointer;\n  font-family: inherit;\n  font-weight: bold;\n}\n\n.tab-btn {\n  display: flex;\n  align-items: center;\n}\n\n.tab-btn i {\n  font-size: 17px;\n  margin-right: 10px;\n}\n\n.scratchblocks {\n  margin-left: 10px;\n}\n\n.dark {\n  background-color: #111;\n  color: #eee;\n}\n.dark #scripts li button {\n  background-color: rgb(46, 46, 46);\n  color: #707070;\n}\n.dark #scripts li button.active-tab {\n  background-color: rgb(76, 76, 76);\n  color: #eee;\n}\n\n.commit {\n  border: 1px solid grey;\n  min-width: 100%;\n  padding: 10px 20px;\n}\n\n.commit-group .commit:first-child {\n  border-radius: 5px;\n  border-bottom-left-radius: 0px;\n  border-bottom-right-radius: 0px;\n}\n\n.commit-group .commit:not(:first-child) {\n  border-top: none;\n}\n\n.commit-group .commit:last-child {\n  border-radius: 5px;\n  border-top-left-radius: 0px;\n  border-top-right-radius: 0px;\n}\n\n.topbar {\n  background-color: #e6f0ff;\n  overflow: hidden;\n  position: sticky;\n  top: 0;\n  display: flex;\n  position: absolute;\n  margin-left: 135px;\n  padding: 10px;\n  border-bottom: 1px solid grey;\n  width: 100%;\n}\n\n.topbar a {\n  display: inline-block;\n  padding: 0 10px;\n  color: hsla(225, 15%, 40%, 0.75);\n  text-decoration: none;\n}\n\n.dark .topbar {\n  background-color: #111;\n}\n\n.dark .topbar a {\n  color: #707070;\n}\n\n.dark .topbar a.active-tab {\n  color: #eee;\n}\n\n.pagination {\n  display: flex;\n  justify-content: center;\n}\n\n.disabled-funny {\n  background-color: hsla(0, 60%, 55%, 1);\n  color: rgba(255, 255, 255, 0.4);\n  cursor: default;\n}\n\n#pathInput::file-selector-button {\n  display: none;\n}\n";

  /** @file Please someone refactor this nonsense */



  function injectStyles() {
    document.head.innerHTML += html$1`
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
    div.${Cmp$1.MENU_ITEM}:has(#push-status):hover {
      cursor: pointer;
    }
    div.${Cmp$1.MENU_ITEM}:has(#allcommits-log):hover {
      cursor: pointer;
    }`;

    document.head.innerHTML += "<style>" + MENU_ITEM_CSS + styles + "</style>";
  }


  /** TODO: deprecate in favor of dedicated menu */
  function addGitMenuButtons(saveArea) {

    // add buttons
    document.querySelector(saveArea).innerHTML += html$1`<div
    class="${Cmp$1.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp$1.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="push-status">
        <span>Push project</span>
      </div>
    </div>
  </div>`;

    secondCateg.innerHTML += html$1`<div
    class="${Cmp$1.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp$1.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="allcommits-log">
        <span>Commits</span>
      </div>
    </div>
  </div>`;

    // add button reactivity
    setTimeout(() => {
      document.querySelector("#push-status").parentElement.parentElement.onclick = async () => {
        document.querySelector("#push-status").style.opacity = "0.5";
        document.querySelector("#push-status").querySelector("span").innerText = "Pushing project...";
        await (await api$1.getCurrentProject()).push();
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


  function initialize () {
    gitMenu.create({
      commitViewHandler: (async () => await commit.display()),
    });

    injectStyles();

    const MENU = `#app > div > div.${Cmp$1.MENU_POSITION}.${Cmp$1.MENU_BAR} > div.${Cmp$1.MENU_CONTAINER}`;
    let saveArea = `${MENU} > div:nth-child(4)`;
    const secondCateg = document.querySelector(saveArea).cloneNode(true);
    document.querySelector(saveArea).after(secondCateg);

    addGitMenuButtons(saveArea);

    document.querySelectorAll(`.${Cmp$1.MENU_ITEM}`)[1].onclick = () => {
      const isDark = document.body.getAttribute("theme") === "dark";
      document.querySelectorAll(".git-button").forEach((element) => {
        element.parentElement.style.backgroundColor = isDark
          ? "#333"
          : "hsla(0, 100%, 65%, 1)";
      });
    };

    if (!fileMenu.isProjectOpen()) {
      welcome.display();
    }
  }

  (async () => {
    await import(
      'https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js'
    );
    await import(
      'https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js'
    );

    globalThis.diffs = undefined;
    globalThis.sprites = undefined;

    // This doesn't seem to work right now
    let addNote = setInterval(async () => {
      try {
        let saveStatus = document.querySelector(`.${Cmp$1.SAVE_STATUS}`).innerHTML;
        if (saveStatus.startsWith("<span>")) {
          let span = document.createElement("span");
          span.id = "shortcutNote";
          span.style.opacity = "0.7";
          span.appendChild(document.createTextNode("(Ctrl+Shift+S for commits)"));
          document
            .querySelector(".save-status_save-now_xBhky")
            .parentNode.after(span);
          clearInterval(addNote);
        }
      } catch { }
    }, 500);

    setInterval(async () => {
      try {
        document.querySelector(`.${Cmp$1.SAVE_STATUS}`).onclick = diff.display;
        document.onkeydown = async (e) => {
          if (e.ctrlKey && e.shiftKey && e.key === "S") {
            await diff.display();
            document.querySelector("#shortcutNote").remove();
          }
        };
      } catch { }
    }, 500);

    window.onload = initialize;
  })();

})();
