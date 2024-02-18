/** @file A tiny wrapper over the local APIs to work with Git projects */
import Cmp from "./accessors";

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
        `http://localhost:${
          this.#portNumber
        }/create-project?file_name=${projectPath}`
      )
    ).json();
    return new Project(response.project_name, this.#portNumber);
  }

  /**
   * Get the current project based on the project name
   * @returns {Promise<Project | undefined>}
   */
  async getCurrentProject() {
    let projectName = document.querySelectorAll(`.${Cmp.MENU_ITEM}`)[7]
      .children[0].value;
    return new Project(projectName, this.#portNumber);
  }
}

export default new ProjectManager(8000);
