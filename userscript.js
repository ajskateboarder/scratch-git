(() => {
  console.log("Reloader enabled - waiting for file changes");
  let reloader = new EventSource("http://localhost:3333/listen");
  reloader.onmessage = () => location.reload();
})();

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

  /**
   * @param {any[]} list
   * @param {any} item
   * @returns {number}
   */
  const count = (list, item) =>
    list.reduce(
      (count, currentValue) => count + (currentValue === item ? 1 : 0),
      0
    );

  /**
   * @param {any[]} oldArray
   * @param {any[]} newArray
   * @returns {any[]}
   */
  function merge(oldArray, newArray) {
    const mergedArray = [...oldArray];

    for (const newItem of newArray) {
      if (!mergedArray.includes(newItem)) {
        mergedArray.push(newItem);
      }
    }

    return mergedArray;
  }

  /**
   * @param {any[]} oldArray
   * @param {any[]} newArray
   * @returns {any[]}
   */
  function diff(oldArray, newArray) {
    const dp = new Array(oldArray.length + 1)
      .fill(null)
      .map(() => new Array(newArray.length + 1).fill(0));
    for (let i = 1; i <= oldArray.length; i++) {
      for (let j = 1; j <= newArray.length; j++) {
        if (oldArray[i - 1] === newArray[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
        }
      }
    }
    /** @type {{added: string[]; removed: string[]; modified: string[]}} */
    const changes = {
      added: [],
      removed: [],
      modified: [],
    };
    let i = oldArray.length;
    let j = newArray.length;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && oldArray[i - 1] === newArray[j - 1]) {
        i--;
        j--;
      } else if (j === 0 || (i > 0 && dp[i][j] === dp[i - 1][j])) {
        changes.removed.push(oldArray[i - 1]);
        i--;
      } else if (i === 0 || (j > 0 && dp[i][j] === dp[i][j - 1])) {
        changes.added.push(newArray[j - 1]);
        j--;
      } else {
        changes.modified.push({
          from: oldArray[i - 1],
          to: newArray[j - 1],
        });
        i--;
        j--;
      }
    }
    changes.added.reverse();
    changes.removed.reverse();
    return changes;
  }

  function html(strings, ...values) {
    let result = strings[0];
    values.forEach((e, i) => {
      result += e + strings[i + 1];
    });
    return result;
  }

  /** @file A lookup to create elements using scratch-gui classnames */

  /** @type {string[]} */
  const classNames = [
    ...[...document.styleSheets].map((e) => {
      try {
        return e.cssRules;
      } catch (e) {
        return;
      }
    }),
  ]
    .filter((e) => e !== undefined)
    .map((e) => Array.from(e))
    .flatMap((e) => e)
    .map((e) => e.selectorText)
    .filter((e) => e !== undefined)
    .map((e) => e.slice(1));

  window.classNames = classNames;

  const select = (className) =>
    classNames.filter((e) => e.includes(className))[0];

  /**
   * Accessors for parts of the UI
   * @enum {string}
   */
  const Cmp = {
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
  window.Cmp = Cmp;
  window.Cmp.select = select;

  /**
   * @typedef GitMenuFunctions
   * @property {() => any} pushHandler
   * @property {() => any} repoLocationHandler
   * @property {() => any} ghTokenHandler
   * @property {() => any} commitViewHandler
   */

  class FileMenu {
    constructor() {
      this.menu = document.querySelectorAll(`div.${Cmp.MENU_ITEM}`)[2];
      this.reactEventHandlers = Object.keys(this.menu).filter((e) =>
        e.startsWith("__reactEventHandlers")
      )[0];
    }

    openProject() {
      this.menu[this.reactEventHandlers].onMouseUp();
      let loadFromComputer = this.menu.querySelectorAll("li")[2];
      loadFromComputer[this.reactEventHandlers].onClick();
      this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
    }

    isProjectOpen() {
      this.menu[this.reactEventHandlers].onMouseUp();
      let savedMenu = new DOMParser().parseFromString(
        this.menu.innerHTML,
        "text/html"
      );
      this.menu[this.reactEventHandlers].children[1].props.onRequestClose();
      return savedMenu.querySelectorAll("li")[3].innerText.endsWith(".sb3");
    }
  }

  /** Git menu instantiator from Edit menu */
  class GitMenu {
    /** @type {HTMLElement} */
    savedItems;

    constructor() {
      this.menu = document.querySelectorAll(`div.${Cmp.MENU_ITEM}`)[2];
      this.reactEventHandlers = Object.keys(this.menu).filter((e) =>
        e.startsWith("__reactEventHandlers")
      )[0];
      this.savedItems = undefined;
      this.newMenu = undefined;
      this.open = false;
    }

    /** @param {number?} index */
    getListItem(index = 1) {
      let li = this.savedItems.querySelectorAll("li")[index - 1];
      return {
        label: (text) => {
          try {
            li.querySelector("span").innerText = text;
          } catch (e) {
            li.innerText = text;
          }
        },
        remove: () => li.remove(),
        onclick: (handler) => {
          li.onclick = () => {
            this.newMenu.classList.remove(Cmp.MENU_ITEM_ACTIVE);
            this.savedItems.style.display = "none";
            this.open = false;
            handler();
          };
        },
        elem: li,
      };
    }

    /**
     * @param {GitMenuFunctions}
     */
    create({
      pushHandler,
      repoLocationHandler,
      ghTokenHandler,
      commitViewHandler,
    }) {
      this.menu[this.reactEventHandlers].onMouseUp();
      /** @type {HTMLElement} */
      this.newMenu = this.menu.cloneNode(true);
      this.menu.after(this.newMenu);
      this.newMenu.classList.remove(Cmp.MENU_ITEM_ACTIVE);
      this.newMenu.querySelector("span").innerText = "Git";
      this.savedItems = this.newMenu
        .querySelector("ul")
        .parentElement.cloneNode(true);
      this.savedItems.classList.add("git-menu");
      this.newMenu.querySelector("ul").parentElement.remove();
      this.savedItems.style.display = "none";
      this.newMenu.appendChild(this.savedItems);

      this.getListItem(1).label("Push project");
      this.getListItem(1).onclick(pushHandler);
      this.getListItem(2).label("Configure repository");
      this.getListItem(2).onclick(repoLocationHandler);
      this.getListItem(3).elem.classList.remove(Cmp.MENU_SECTION);
      this.getListItem(3).label("Configure GitHub token");
      this.getListItem(3).onclick(ghTokenHandler);
      this.getListItem(4).remove();
      this.getListItem(5).remove();
      this.getListItem(4).remove();
      this.getListItem(4).label("View commits");
      this.getListItem(4).onclick(commitViewHandler);

      this.newMenu.onclick = () => {
        if (this.savedItems.style.display === "none") {
          this.newMenu.classList.add(Cmp.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = "block";
          this.open = true;
        } else {
          this.newMenu.classList.remove(Cmp.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = "none";
          this.open = false;
        }
      };
      document.querySelector("#app").onmouseup = (e) => {
        /** @type {Event} */
        let event = e;
        if (
          event.target !== this.newMenu &&
          event.target.parentNode !== this.newMenu &&
          this.open
        ) {
          this.newMenu.classList.remove(Cmp.MENU_ITEM_ACTIVE);
          this.savedItems.style.display = "none";
          this.open = false;
        }
      };
    }
  }

  class Alert {
    static CLOSE_BUTTON_SVG =
      "data:image/svg+xml;base64, \
  PHN2ZyBpZD0iTGF5ZXJfMSIgZGF0YS1uYW1lPSJMYXllciAxIiB4bWxucz0iaHR0cDovL3d \
  3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCA3LjQ4IDcuNDgiPjxkZWZzPjxzdH \
  lsZT4uY2xzLTF7ZmlsbDpub25lO3N0cm9rZTojZmZmO3N0cm9rZS1saW5lY2FwOnJvdW5kO \
  3N0cm9rZS1saW5lam9pbjpyb3VuZDtzdHJva2Utd2lkdGg6MnB4O308L3N0eWxlPjwvZGVm \
  cz48dGl0bGU+aWNvbi0tYWRkPC90aXRsZT48bGluZSBjbGFzcz0iY2xzLTEiIHgxPSIzLjc \
  0IiB5MT0iNi40OCIgeDI9IjMuNzQiIHkyPSIxIi8+PGxpbmUgY2xhc3M9ImNscy0xIiB4MT \
  0iMSIgeTE9IjMuNzQiIHgyPSI2LjQ4IiB5Mj0iMy43NCIvPjwvc3ZnPg==";

    /** @param {{message: string; duration: number}} */
    constructor({ message, duration }) {
      this.message = message;
      this.duration = duration;
    }

    display() {
      document.querySelector(`.${Cmp.ALERT_CONTAINER}`).innerHTML = html`<div
      class="${Cmp.ALERT_DIALOG} ${Cmp.ALERT_SUCCESS} ${Cmp.BOX}"
      style="justify-content: space-between"
    >
      <div class="${Cmp.ALERT_MESSAGE}">${this.message}</div>
      <div class="${Cmp.ALERT_BUTTONS}">
        <div class="${Cmp.ALERT_CLOSE_CONTAINER} ${Cmp.BOX}">
          <div
            aria-label="Close"
            class="${Cmp.CLOSE_BUTTON} ${Cmp.CLOSE_BUTTON_LARGE}"
            role="button"
            tabindex="0"
          >
            <img
              class="${Cmp.CLOSE_ICON} undefined"
              src="${Alert.CLOSE_BUTTON_SVG}"
            />
          </div>
        </div>
      </div>
    </div>`;
      if (document.querySelector("body").getAttribute("theme") === "dark") {
        document.querySelector(`.${Cmp.CLOSE_BUTTON}`).style.backgroundColor =
          "rgba(0, 0, 0, 0.255)";
      }
      document.querySelector(`.${Cmp.CLOSE_BUTTON}`).onclick = this.remove;
      setTimeout(this.remove, this.duration);
    }

    remove() {
      document.querySelector(`.${Cmp.ALERT_CONTAINER}`).innerHTML = "";
    }
  }

  /** @param {{message: string; duration: number}} */
  function scratchAlert({ message, duration }) {
    new Alert({ message, duration }).display();
  }

  const fileMenu = new FileMenu();
  const gitMenu = new GitMenu();
  window.gitMenu = gitMenu;

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
     * @param {string} projectPath
     * @returns {Promise<Project>}
     */
    async createProject(projectPath) {
      let response = await (
        await fetch(
          `http://localhost:${
          this.#portNumber
        }/create_project?file_name=${projectPath}`
        )
      ).json();
      return new Project(response.project_name, this.#portNumber);
    }

    /**
     * @returns {Promise<Project | undefined>}
     */
    async getCurrentProject() {
      let projectName = document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[7]
        .children[0].value;
      return new Project(projectName, this.#portNumber);
    }
  }

  var api = new ProjectManager(6969);

  window.modalSteps = {
    goToStep1: () =>
      (document.querySelector("#welcomeLog").innerHTML =
        WELCOME_MODAL_STEP_1(false)),
    goToStep2: () =>
      (document.querySelector("#welcomeLog").innerHTML = WELCOME_MODAL_STEP_2),
    goToStep3: (path) => {
      (async () => {
        await api.createProject(path);
        document.querySelector("#welcomeLog").innerHTML = WELCOME_MODAL_STEP_3;
      })();
    },
    openProjectPath: () =>
      document
        .querySelector("#nextButton2")
        .classList.remove(Cmp.DISABLED_BUTTON),
    openProject: () => {
      fileMenu.openProject();
      /** @type {HTMLButtonElement} */
      let nextButton = document.querySelector("#nextButton");
      nextButton.disabled = false;
      nextButton.classList.remove(Cmp.DISABLED_BUTTON);
    },
  };

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
      onclick="modalSteps.openProject()"
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
        onclick="document.querySelector('#welcomeLog').close()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON}"
      >
        Close
      </button>
      <button
        onclick="modalSteps.goToStep2()"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${disabled ? Cmp.DISABLED_BUTTON : ""}"
        ${disabled ? "disabled" : ""}
        id="nextButton"
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
        type="file"
        id="pathInput"
        class="${Cmp.SETTINGS_BUTTON}"
        onclick="modalSteps.openProjectPath()"
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
        onclick="modalSteps.goToStep1()"
      >
        Back
      </button>
      <button
        onclick="modalSteps.goToStep3(document.querySelector('#pathInput').files[0].path)"
        style="align-items: right; margin-left: -10px; "
        class="${Cmp.SETTINGS_BUTTON} ${Cmp.DISABLED_BUTTON}"
        id="nextButton2"
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
        onclick="document.querySelector('#welcomeLog').close()"
      >
        Close
      </button>
    </div>
  </div>
`;

  const WELCOME_MODAL = html`<dialog
  id="welcomeLog"
  style="overflow-x: hidden"
>
  ${WELCOME_MODAL_STEP_1(true)}
</dialog>`;

  const DIFF_MODAL = html`<dialog
  id="commitLog"
  style="overflow-x: hidden"
>
  <div class="content">
    <div class="topbar"></div>
    <div class="sidebar">
      <ul id="scripts"></ul>
      <br />
    </div>
    <div class="blocks">
      <p id="commits">Hello worldus</p>
      <div
        class="bottom-bar"
        style="margin: 0; padding: 0; bottom: 10px; margin-left: 10px;"
      >
        <select onchange="rerender(this.value)" id="styleChoice">
          <option value="scratch3">Scratch 3.0</option>
          <option value="scratch2">Scratch 2.0</option>
          <option value="scratch3-high-contrast">
            Scratch 3.0 (High Contrast)
          </option>
        </select>
        <button
          onclick="document.querySelector('#commitLog').close()"
          class="${Cmp.SETTINGS_BUTTON}"
          id="commitButton"
        >
          Okay
        </button>
      </div>
    </div>
  </div>
</dialog>`;

  const COMMIT_MODAL = html`<dialog
  id="allcommitLog"
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
        onclick="document.querySelector('#allcommitLog').close()"
        class="${Cmp.SETTINGS_BUTTON}"
        id="commitButton"
      >
        Okay
      </button>
    </div>
  </div>
</dialog>`;

  /** @file Please someone refactor this nonsense */


  function injectStyles() {
    document.head.innerHTML += html`
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
  div.${Cmp.MENU_ITEM}:has(#push-status):hover {
    cursor: pointer;
  }
  div.${Cmp.MENU_ITEM}:has(#allcommits-log):hover {
    cursor: pointer;
  }`;
    // This is kind of cursed.. lol
    document.head.innerHTML += html`<style>
    ${MENU_ITEM_CSS} .content {
      display: flex;
    }
    .sidebar {
      width: fit-content;
      position: fixed;
      top: 25%;
      height: 50%;
      padding-right: 5px;
      border-right: 1px solid grey;
      background-color: #e6f0ff;
      overflow: auto;
    }
    .sidebar ul {
      list-style-type: none;
      margin: 0;
      padding: 0;
    }
    .sidebar li {
      list-style-type: none;
    }
    .sidebar li button {
      padding: 15px 30px;
      border: 0.5px solid grey;
      background-color: #d9e3f2;
      color: hsla(225, 15%, 40%, 0.75);
      transition: 0.2s background-color ease-in;
      margin-top: 10px;
      border-top-right-radius: 10px;
      border-bottom-right-radius: 10px;
    }
    .sidebar li button:hover {
      background-color: #ccd3dd;
    }
    .sidebar li button.active-tab,
    .topbar a.active-tab {
      color: hsla(0, 100%, 65%, 1);
      background-color: white;
      outline: none;
    }
    .blocks {
      flex: 1;
      padding: 20px;
      margin-left: 12.5%;
      margin-top: 30px;
    }
    .bottom {
      margin-top: auto;
    }
    #commitLog,
    #allcommitLog,
    #welcomeLog {
      height: 50%;
      max-height: 50%;
      padding: 0;
      width: 50%;
    }
    .bottom-bar {
      position: sticky;
      width: 100%;
      display: flex;
      justify-content: space-between;
      background-color: transparent;
      padding: 10px;
      bottom: 0;
    }
    .bottom-bar select {
      font-size: 14px;
      background-color: hsla(0, 100%, 65%, 1);
      color: white;
      border: none;
      padding: 0.5rem 1rem;
      border-radius: 4px;
      cursor: pointer;
      font-family: inherit;
      font-weight: bold;
    }
    .tab-btn {
      display: flex;
      align-items: center;
    }
    .tab-btn i {
      font-size: 17px;
      margin-right: 10px;
    }
    .scratchblocks {
      margin-left: 10px;
    }
    .dark {
      background-color: #111;
      color: #eee;
    }
    .dark #scripts li button {
      background-color: rgb(46, 46, 46);
      color: #707070;
    }
    .dark #scripts li button.active-tab {
      background-color: rgb(76, 76, 76);
      color: #eee;
    }

    .commit {
      border: 1px solid grey;
      min-width: 100%;
      padding: 10px 20px;
    }
    .commit-group .commit:first-child {
      border-radius: 5px;
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }
    .commit-group .commit:not(:first-child) {
      border-top: none;
    }
    .commit-group .commit:last-child {
      border-radius: 5px;
      border-top-left-radius: 0px;
      border-top-right-radius: 0px;
    }

    .topbar {
      background-color: #e6f0ff;
      overflow: hidden;
      position: sticky;
      top: 0;
      display: flex;
      position: absolute;
      margin-left: 135px;
      padding: 10px;
      border-bottom: 1px solid grey;
      width: 100%;
    }

    .topbar a {
      display: inline-block;
      padding: 0 10px;
      color: hsla(225, 15%, 40%, 0.75);
      text-decoration: none;
    }

    .dark .topbar {
      background-color: #111;
    }

    .dark .topbar a {
      color: #707070;
    }

    .dark .topbar a.active-tab {
      color: #eee;
    }

    .pagination {
      display: flex;
      justify-content: center;
    }

    .disabled-funny {
      background-color: hsla(0, 60%, 55%, 1);
      color: rgba(255, 255, 255, 0.4);
      cursor: default;
    }

    #pathInput::file-selector-button {
      display: none;
    }
  </style>`;
  }

  async function initCommits() {
    function renderCommits(commits) {
      document.querySelector(".commit-group").innerHTML = commits
        .map(
          (e) =>
            html`<div class="commit">
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
    document.querySelector("#older").onclick = () => {
      if (document.querySelector("#older").classList.contains("disabled-funny")) {
        return;
      }
      offset += 40;
      renderCommits(commits.slice(offset, offset + 40));
      if (
        commits.slice(offset, offset + 40).includes(commits[commits.length - 1])
      ) {
        document.querySelector("#older").classList.add("disabled-funny");
      }
      if (commits.slice(offset, offset + 40).includes(commits[0])) {
        document.querySelector("#newer").classList.add("disabled-funny");
      } else {
        document.querySelector("#newer").classList.remove("disabled-funny");
      }
    };
    document.querySelector("#newer").onclick = () => {
      if (document.querySelector("#newer").classList.contains("disabled-funny")) {
        return;
      }
      offset -= 40;
      renderCommits(commits.slice(offset, offset + 40));
      if (
        !commits.slice(offset, offset + 40).includes(commits[commits.length - 1])
      ) {
        document.querySelector("#older").classList.remove("disabled-funny");
      }
      if (commits.slice(offset, offset + 40).includes(commits[0])) {
        document.querySelector("#newer").classList.add("disabled-funny");
      }
    };

    const modal = document.querySelector("#allcommitLog");
    if (!modal.open) {
      modal.showModal();
    }
    document.querySelector("#older").blur();
  }

  function initialize () {
    window.fileMenu = fileMenu;
    gitMenu.create({
      commitViewHandler: initCommits,
    });

    const MENU = `#app > div > div.${Cmp.MENU_POSITION}.${Cmp.MENU_BAR} > div.${Cmp.MENU_CONTAINER}`;
    const SAVE_AREA = `${MENU} > div:nth-child(4)`;
    let secondCateg = document.querySelector(SAVE_AREA).cloneNode(true);
    document.querySelector(SAVE_AREA).after(secondCateg);

    injectStyles();

    document.querySelector(SAVE_AREA).innerHTML += html`<div
    class="${Cmp.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="push-status">
        <span>Push project</span>
      </div>
    </div>
  </div>`;

    secondCateg.innerHTML += html`<div
    class="${Cmp.MENU_ACCOUNTINFOGROUP} git-button"
  >
    <div class="${Cmp.MENU_ITEM}" style="padding: 0 0.375rem 0 0.375rem">
      <div id="allcommits-log">
        <span>Commits</span>
      </div>
    </div>
  </div>`;

    document.querySelector(SAVE_AREA).innerHTML += DIFF_MODAL;

    document.querySelector(SAVE_AREA).innerHTML += COMMIT_MODAL;

    document.querySelector(SAVE_AREA).innerHTML += WELCOME_MODAL;

    setTimeout(() => {
      document.querySelector("#push-status").parentElement.parentElement.onclick =
        async () => {
          document.querySelector("#push-status").style.opacity = "0.5";
          document.querySelector("#push-status").querySelector("span").innerText =
            "Pushing project...";
          await (await api.getCurrentProject()).push();
          document.querySelector("#push-status").style.opacity = "1";
          document.querySelector("#push-status").querySelector("span").innerText =
            "Push project";
          scratchAlert({
            message: "Commits pushed successfully",
            duration: 5000,
          });
        };
      document.querySelector(
        "#allcommits-log"
      ).parentElement.parentElement.onclick = initCommits;
      document.querySelectorAll(".git-button").forEach((element) => {
        element.parentElement.onmouseenter = () => {
          element.parentElement.style.backgroundColor =
            "var(--ui-black-transparent, hsla(0, 0%, 0%, 0.15))";
        };
        element.parentElement.onmouseleave = () => {
          element.parentElement.style.backgroundColor =
            document.body.getAttribute("theme") === "dark"
              ? "#333"
              : "hsla(0, 100%, 65%, 1)";
        };
      });
    }, 500);
    document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[1].onclick = () => {
      let isDark = document.body.getAttribute("theme") === "dark";
      document.querySelectorAll(".git-button").forEach((element) => {
        element.parentElement.style.backgroundColor = isDark
          ? "#333"
          : "hsla(0, 100%, 65%, 1)";
      });
    };
    if (!fileMenu.isProjectOpen()) {
      document.querySelector("#welcomeLog").showModal();
    }
  }

  /**
   * @typedef ScriptDiffOptions
   * @property {object} oldProject
   * @property {object} newProject
   * @property {number} scriptNumber
   * @property {boolean?} skipParsing
   */

  class ScriptDiff {
    /** @type {("added" | "removed" | "modified")} */
    status;

    /**
     * @param {ScriptDiffOptions}
     */
    constructor({ oldProject, newProject, scriptNumber, skipParsing = false }) {
      if (!skipParsing) {
        const parsed = parseBlocks(oldProject, newProject, scriptNumber);
        this.old = parsed.oldBlocks
          .split("\n")
          .map((item, i) => `${i} ${item.trim()}`);
        this.new = parsed.newBlocks
          .split("\n")
          .map((item, i) => `${i} ${item.trim()}`);
      }
      this.scriptNo = scriptNumber;

      if (!skipParsing) {
        this.difference = diff(this.old, this.new);
        this.merged = ScriptDiff.fixCBlocks(merge(this.old, this.new));
      }
    }

    /** @param {string[]} merged @returns {string[]}*/
    static fixCBlocks(merged) {
      /** @type {string[]} */
      let mergedNre = merged.map((e) => e.substring(e.indexOf(" ") + 1));
      let cBlockFound = false;
      [...mergedNre].forEach((block, i) => {
        if (block === "forever" || block.startsWith("repeat")) {
          cBlockFound = true;
        }
        if (block === "end" && cBlockFound) {
          mergedNre = mergedNre.filter((e) => e !== mergedNre[i]);
          cBlockFound = false;
        }
      });
      let cBlocksOnly = mergedNre.map((e) => {
        if (e.includes("forever") || e.includes("repeat")) {
          return "cBlock";
        } else if (e.includes("end")) {
          return "end";
        } else {
          return e;
        }
      });
      while (
        count(cBlocksOnly, "cBlock") !==
        count(cBlocksOnly, "end")
      ) {
        mergedNre.push("end");
        cBlocksOnly.push("end");
      }
      let returned = mergedNre.map((e, i) => `${i} ${e}`);
      return returned;
    }

    /** @returns {boolean} */
    get hasDiffs() {
      return !(
        this.difference.added.length === 0 &&
        this.difference.removed.length === 0 &&
        this.difference.modified.length === 0
      );
    }

    /** @returns {string[]} */
    static events(project) {
      return Object.keys(project).filter((key) =>
        project[key].opcode.startsWith("event_when")
      );
    }

    /** Finds all scripts which have been modified in some way */
    static availableSprites(oldProject, newProject) {
      const _scripts = this.events(oldProject);
      const _newScripts = this.events(newProject);

      const scripts = _scripts.map((e, i) => ({ scriptLoc: e, index: i }));
      const newScripts = _newScripts.map((e, i) => ({ scriptLoc: e, index: i }));

      const modified = scripts.filter((e) => {
        try {
          const oldblocks = parseSB3Blocks.toScratchblocks(
            _scripts[e.index],
            oldProject,
            "en",
            {
              tabs: "",
            }
          );
          const newblocks = parseSB3Blocks.toScratchblocks(
            _newScripts[e.index],
            newProject,
            "en",
            {
              tabs: "",
            }
          );
          return oldblocks !== newblocks;
        } catch {
          console.warn(e);
        }
      });

      const removed = scripts.filter((e) => newScripts[e.index] === undefined);
      const added = newScripts.filter((e) => scripts[e.index] === undefined);

      return {
        modified,
        removed,
        added,
      };
    }

    /** @param {("scratch3" | "scratch3-high-contrast" | "scratch2")} style */
    renderBlocks(style = "scratch3") {
      const code = this.merged
        .map((item) => item.substring(item.indexOf(" ") + 1))
        .join("\n");
      document.querySelector("#commits").innerText = code;

      scratchblocks.renderMatching("#commits", {
        style: style,
        scale: style === "scratch2" ? 1.15 : 0.675,
      });

      let blocks = Array.from(
        document.querySelectorAll(`.scratchblocks-style-${style} g > g path`)
      ).filter((e) => e?.parentElement?.nextElementSibling?.innerHTML !== "then");
      if (style === "scratch2") {
        blocks = blocks.filter((e) => !e.classList.contains("sb-input"));
      }

      let addedC = [...this.difference.added];
      let removedC = [...this.difference.removed];

      // highlight blocks that have been removed in merge
      if (this.status !== "added") {
        // added scripts don't have any removed blocks lol
        this.merged.forEach((item, i) => {
          if (removedC.includes(item)) {
            try {
              removedC = removedC.filter((e) => e !== item);
              const block = blocks[i].cloneNode(true);
              block.style.fill = "red";
              block.style.opacity = "0.5";
              blocks[i].parentElement.appendChild(block);
            } catch {}
          }
        });
      }

      // highlight blocks that have been added in merge
      this.merged.forEach((item, i) => {
        if (addedC.includes(item)) {
          addedC = addedC.filter((e) => e !== item);
          let block;
          try {
            block = blocks[i].cloneNode(true);
          } catch (e) {
            return console.warn(`${e}\n\nFailed to find/parse block ${i}`);
          }
          block.style.fill = "green";
          block.style.opacity = "0.5";
          try {
            blocks[i].parentElement.appendChild(block);
          } catch (e) {
            console.warn(`${e}\n\nFailed to find/parse block ${i}`);
          }
        }
      });

      if (
        typeof addedC[0] !== "undefined" &&
        (addedC[0].endsWith("forever") || addedC[0].includes("repeat"))
      ) {
        let forevers = blocks.filter((e) => {
          let _text = e.parentElement.querySelector("text").innerHTML;
          return _text === "forever" || _text === "repeat";
        });
        if (forevers.length === 1) {
          let afterForevers = blocks.slice(blocks.indexOf(forevers[0]));
          afterForevers.forEach((block) => {
            let copy = block.cloneNode();
            copy.style.fill = "green";
            copy.style.opacity = "0.5";
            block.parentElement.appendChild(copy);
          });
        } else {
          let lineNo = parseInt(addedC[0].split(" ")[0]);
          let changedForeverBlock = forevers[lineNo - 1] ?? forevers[lineNo - 2];
          let shrek2 = blocks.slice(blocks.indexOf(changedForeverBlock));
          shrek2.forEach((block) => {
            let copy = block.cloneNode();
            copy.style.fill = "green";
            copy.style.opacity = "0.5";
            block.parentElement.appendChild(copy);
          });
        }
      }

      if (this.status === "added") {
        blocks.forEach((block) => {
          let copy = block.cloneNode();
          copy.style.fill = "green";
          copy.style.opacity = "0.5";
          block.parentElement.appendChild(copy);
        });
      }

      // remove duplicate highlights
      const htmls = Array.from(document.querySelectorAll("path[class^='sb3-'"));

      if (addedC.length !== 0) {
        htmls
          .slice(
            htmls.indexOf(htmls.filter((e) => e.style.fill === "red").pop()) + 1
          )
          .forEach((block) => {
            let copy = block.cloneNode();
            copy.style.fill = "green";
            copy.style.opacity = "0.5";
            block.parentElement.appendChild(copy);
          });
      }

      const noDupes = [...new Set(htmls.map((e) => e.outerHTML))];

      const dupesOnly = htmls.filter((e) => !noDupes.includes(e.outerHTML));
      dupesOnly.forEach((element) => element.remove());
    }
  }

  /**
   * @param {object} oldProject
   * @param {object} newProject
   */
  function createDiffs(oldProject, newProject) {
    const changes = ScriptDiff.availableSprites(oldProject, newProject);

    /** @type {{modified: ScriptDiff[]; removed: ScriptDiff[]; added: ScriptDiff[]}} */
    const diffs = {
      modified: [],
      removed: [],
      added: [],
    };

    changes.modified.forEach((e) => {
      const script = new ScriptDiff({
        oldProject: oldProject,
        newProject: newProject,
        scriptNumber: e.index,
      });

      script.status = "modified";
      if (script.hasDiffs) {
        diffs.modified.push(script);
      }
    });

    changes.removed.forEach((e) => {
      const oldBlocks = parseSB3Blocks.toScratchblocks(
        e.scriptLoc,
        oldProject,
        "en",
        {
          tabs: "",
        }
      );
      const script = new ScriptDiff({ skipParsing: true });
      script.old = oldBlocks.split("\n").map((item, i) => `${i} ${item.trim()}`);
      script.new = "".split("\n").map((item, i) => `${i} ${item.trim()}`);
      script.difference = diff(script.old, script.new);
      script.merged = ScriptDiff.fixCBlocks(
        merge(script.old, script.new)
      );
      script.scriptNo = e.index;
      script.status = "removed";
      diffs.removed.push(script);
    });

    changes.added.forEach((e) => {
      const newBlocks = parseSB3Blocks.toScratchblocks(
        e.scriptLoc,
        newProject,
        "en",
        {
          tabs: "",
        }
      );
      const script = new ScriptDiff({ skipParsing: true });
      script.old = "".split("\n").map((item, i) => `${i} ${item.trim()}`);
      script.new = newBlocks.split("\n").map((item, i) => `${i} ${item.trim()}`);
      script.difference = diff(script.old, script.new);
      script.merged = ScriptDiff.fixCBlocks(
        merge(script.old, script.new)
      );
      script.scriptNo = e.index;
      script.status = "added";
      diffs.added.push(script);
    });
    return diffs;
  }

  function parseBlocks(oldProject, newProject, scriptNumber) {
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

  /**
   * Render diffs from a script from a sprite
   * @param {{sprite: string; script: number?; style: "scratch3" | "scratch3-high-contrast" | "scratch2")}}
   */
  async function showDiffs({ sprite, script = 0, style }) {
    await import(
      'https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js'
    );
    await import(
      'https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js'
    );

    let project = await api.getCurrentProject();

    const oldProject = await project.getPreviousScripts(sprite);
    const newProject = await project.getCurrentScripts(sprite);
    const diffs = createDiffs(oldProject, newProject);

    document.querySelector("#scripts").innerHTML = "";
    document.querySelector("#commits").innerHTML = "";

    document.querySelector("#commitButton").onclick = async () => {
      const message = await project.commit();
      document.querySelector("#commitLog").close();
      scratchAlert({
        message: `Commit successful. ${message}`,
        duration: 5000,
      });
    };

    Array.from(Object.values(diffs)).flat(Infinity)[script].renderBlocks(style);

    const modal = document.querySelector("#commitLog");
    if (!modal.open) {
      modal.showModal();
    }

    document.querySelector(".topbar").innerHTML = "";

    globalThis.sprites.forEach((sprite) => {
      let newItem = document.createElement("a");
      newItem.href = "#whatever";
      newItem.appendChild(document.createTextNode(sprite));
      newItem.onclick = async () => {
        document
          .querySelectorAll(".topbar a")
          .forEach((e) => e.classList.remove("active-tab"));
        newItem.classList.add("active-tab");

        await showDiffs({
          sprite: sprite,
          style: document.querySelector("#styleChoice").value,
        });
      };
      document.querySelector(".topbar").appendChild(newItem);
    });

    Array.from(Object.values(diffs))
      .flat(Infinity)
      .forEach((diff, i) => {
        let newItem = document.createElement("li");
        let link = document.createElement("button");
        link.title = diff.status.charAt(0).toUpperCase() + diff.status.slice(1);
        link.classList.add("tab-btn");
        link.setAttribute("script-no", i);
        link.onclick = async () => {
          document
            .querySelectorAll(".tab-btn")
            .forEach((e) => e.classList.remove("active-tab"));
          link.classList.add("active-tab");

          await showDiffs({
            sprite: document.querySelector("a.active-tab").innerText,
            script: i,
            style: document.querySelector("#styleChoice").value,
          });
        };
        switch (diff.status) {
          case "added":
            link.innerHTML = `<i class="fa-solid fa-square-plus"></i> Script ${diff.scriptNo}`;
            break;
          case "modified":
            link.innerHTML = `<i class="fa-solid fa-square-minus"></i> Script ${diff.scriptNo}`;
            break;
          case "removed":
            link.innerHTML = `<i class="fa-solid fa-square-xmark"></i> Script ${diff.scriptNo}`;
            break;
        }
        newItem.appendChild(link);
        document.querySelector("#scripts").appendChild(newItem);
      });

    document.querySelectorAll(".tab-btn")[script].classList.add("active-tab");
    document
      .querySelectorAll(".topbar a")
      [globalThis.sprites.indexOf(sprite)].classList.add("active-tab");

    globalThis.diffs = Array.from(Object.values(diffs)).flat(Infinity);
    if (document.querySelector("body").getAttribute("theme") === "dark") {
      document.querySelector(".sidebar").classList.add("dark");
      document.querySelector(".topbar").classList.add("dark");
    } else {
      document.querySelector(".sidebar").classList.remove("dark");
    }
  }

  async function initDiffs() {
    let project = await api.getCurrentProject();
    await project.unzip();

    globalThis.sprites = await project.getSprites();

    document.querySelector("#styleChoice").value = "scratch3";

    await showDiffs({ sprite: globalThis.sprites[0] });
  }

  (async () => {
    globalThis.diffs = undefined;
    globalThis.sprites = undefined;

    // This doesn't seem to work right now
    let addNote = setInterval(async () => {
      try {
        let saveStatus = document.querySelector(`.${Cmp.SAVE_STATUS}`).innerHTML;
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
      } catch {}
    }, 500);

    setInterval(async () => {
      try {
        document.querySelector(`.${Cmp.SAVE_STATUS}`).onclick = initDiffs;
        document.onkeydown = async (e) => {
          if (e.ctrlKey && e.shiftKey && e.key === "S") {
            await initDiffs();
            document.querySelector("#shortcutNote").remove();
          }
        };
      } catch {}
    }, 500);

    window.onload = initialize;
  })();

})();
