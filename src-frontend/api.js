/** @file A tiny wrapper over the local APIs to work with Git projects */
import { Cmp } from "./dom/index";

/**
 * @typedef Commit
 * @property {{date: string; email: string; name: string}} author
 * @property {string} body
 * @property {string} commit
 * @property {string} subject
 * @property {string} shortDate
 */

/**
 * @typedef Command
 * @property {"diff" | "create-project" | "exists" | "unzip" | "commit" | "push" | "current-project" | "previous-project" | "get-commits" | "get-changed-sprites"} command
 * @property {Object} data
 * @property {{project_name: string; sprite_name?: string}} data.Project
 * @property {{old_content: string; new_content: string}} data.GitDiff
 * @property {{file_name: string}} data.FilePath
 */

export class Project {
  #ws;

  /** Constructs a project
   * @param {string} project
   * @param {ProjectManager} ws
   */
  constructor(project, ws) {
    this.project = project;
    this.#ws = ws;
  }

  /** @param {Command} */
  async #request({ command, data }) {
    this.#ws.send(JSON.stringify({ command, data }));
    return JSON.parse(await this.#ws.receive());
  }

  /** Returns if the project has been linked to scratch.git
   *
   * @returns {Promise<boolean>} */
  async exists() {
    return await this.#request({
      command: "exists",
      data: { Project: { project_name: this.project } },
    });
  }

  /** @returns {Promise<Commit[]>} */
  async getCommits() {
    let commits = await this.#request({
      command: "get-commits",
      data: { Project: { project_name: this.project } },
    });
    return [...commits][0].map((commit) => {
      return {
        ...commit,
        shortDate: commit.author.date.split(" ").slice(0, 4),
      };
    });
  }

  /** Retreive sprites that have been changed since project changes
   * Sorted alphabetically
   *
   * @returns {Promise<string[][]>}
   */
  async getSprites() {
    /** @type {string[][]} */
    let sprites = (
      await this.#request({
        command: "get-changed-sprites",
        data: { Project: { project_name: this.project } },
      })
    ).sprites;
    return sprites.sort((a, b) => a[0].localeCompare(b[0]));
  }

  /** @param {string} sprite */
  async getCurrentScripts(sprite) {
    return await this.#request({
      command: "current-project",
      data: { Project: { project_name: this.project, sprite_name: sprite } },
    });
  }

  /** @param {string} sprite */
  async getPreviousScripts(sprite) {
    return await this.#request({
      command: "previous-project",
      data: { Project: { project_name: this.project, sprite_name: sprite } },
    });
  }

  /** Commit the current project to Git
   *
   * @returns {Promise<string>}
   */
  async commit() {
    return await this.#request({
      command: "commit",
      data: { Project: { project_name: this.project } },
    });
  }

  async push() {
    await this.#request({
      command: "push",
      data: { Project: { project_name: this.project } },
    });
  }

  async unzip() {
    await this.#request({
      command: "unzip",
      data: { Project: { project_name: this.project } },
    });
  }
}

export class ProjectExistsException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}

// class factory jumpscare
class ProjectManager extends WebSocket {
  /** @param {string} url */
  constructor(url) {
    super(url);
  }

  receive() {
    return new Promise((resolve, reject) => {
      this.onmessage = (message) => {
        return resolve(message.data);
      };

      this.onerror = (error) => {
        return reject(error);
      };
    });
  }

  /**
   * @param {string} projectName
   * @returns {Promise<Project>}
   */
  async getProject(projectName) {
    return new Project(projectName, this);
  }

  /**
   * Create and git-init a new project
   * @param {string} projectPath
   * @returns {Promise<Project>}
   * @throws {ProjectExistsException}
   */
  async createProject(projectPath) {
    this.send(
      JSON.stringify({
        command: "create-project",
        data: { FilePath: projectPath },
      })
    );

    let response = await this.receive();
    if (response.project_name === "exists") {
      throw new ProjectExistsException(
        `${projectPath
          .split("/")
          .pop()} is already a project.<wbr /> Either load the existing<wbr /> project or make a copy of<wbr /> the project file.`
      );
    } else if (response.project_name === "fail") {
      throw new Error(
        `An uncaught error has occured.<wbr />
        Please check the server logs and<wbr /> <a href="https://github.com/ajskateboarder/scratch-git/issues">file an issue on GitHub</a> with system info.`
      );
    }

    return new Project(response.project_name, this);
  }

  /**
   * Get the current project based on the project name
   * @returns {Promise<Project | undefined>}
   */
  async getCurrentProject() {
    /** @type {HTMLDivElement} */
    let projectName;

    if (document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`)) {
      projectName = document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`)
        .parentElement.nextElementSibling.nextElementSibling.children[0].value;
    } else {
      const projectNameElement = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`)) {
            observer.disconnect();
            resolve(document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`));
          }
        });
        observer.observe(document.body, {
          childList: true,
          subtree: true,
        });
      });
      projectName =
        projectNameElement.parentElement.nextElementSibling.nextElementSibling
          .children[0].value;
    }

    return new Project(projectName, this);
  }
}

export default new ProjectManager("ws://localhost:8000");
