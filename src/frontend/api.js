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

class Project {
  #portNumber;

  /** @param {string} project */
  constructor(project, portNumber = 6969) {
    this.project = project;
    this.#portNumber = portNumber;
  }

  async #request(path) {
    return await fetch(
      `http://localhost:${this.#portNumber}/${this.project}${path}`
    );
  }

  /** @returns {Promise<Commit[]>} */
  async getCommits() {
    return [...(await (await this.#request("/commits")).json())][0].map(
      (commit) => {
        return {
          ...commit,
          shortDate: commit.author.date.split(" ").slice(0, 4),
        };
      }
    );
  }

  /** Retreive sprites that have been changed since project changes
   * Sorted alphabetically
   *
   * @returns {Promise<string[]>}
   */
  async getSprites() {
    /** @type {string[]} */
    let sprites = (await (await this.#request("/sprites")).json()).sprites;
    sprites.sort((a, b) => a.localeCompare(b));
    return sprites;
  }

  /** @param {string} sprite */
  async getCurrentScripts(sprite) {
    return await (await this.#request(`/project.json?name=${sprite}`)).json();
  }

  /** @param {string} sprite */
  async getPreviousScripts(sprite) {
    return await (
      await this.#request(`/project.old.json?name=${sprite}`)
    ).json();
  }

  /** Commit the current project to Git
   *
   * @returns {string}
   */
  async commit() {
    return await (await this.#request("/commit")).json().message;
  }

  async push() {
    await this.#request("/push");
  }

  async unzip() {
    await this.#request("/unzip");
  }
}

export class ProjectExistsException extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
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
   * @throws {e}
   */
  async createProject(projectPath) {
    const response = await fetch(
      `http://localhost:${
        this.#portNumber
      }/create-project?file_name=${projectPath}`
    ).then((res) => res.json());
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
    return new Project(response.project_name, this.#portNumber);
  }

  /**
   * Get the current project based on the project name
   * @returns {Promise<Project | undefined>}
   */
  async getCurrentProject() {
    const projectName = document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[6]
      .children[0].value;
    return new Project(projectName, this.#portNumber);
  }
}

export default new ProjectManager(8000);
