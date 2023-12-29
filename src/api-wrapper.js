/** @file A tiny wrapper over the local APIs to work with Git projects */

/**
 * @typedef Commit
 * @property {{date: string; email: string; name: string}} author
 * @property {string} body
 * @property {string} commit
 * @property {string} subject
 * @property {string} shortDate
 */

/** Project management */
class Project {
  /** @type {string} */
  project;

  /**
   * @constructor
   * @param {string} project
   */
  constructor(project, portNumber = 6969) {
    this.project = project;
    this.portNumber = portNumber;
  }

  /** @returns {Promise<Commit[]>} */
  async getCommits() {
    let commits = await (
      await fetch(`http://localhost:${this.portNumber}/${this.project}/commits`)
    ).json();
    [...commits].forEach(
      (commit, i) =>
        (commits[i].shortDate = commit.author.date.split(" ").slice(0, 4))
    );
    return commits;
  }

  async getSprites() {
    let response = await (
      await fetch(`http://localhost:${this.portNumber}/${this.project}/sprites`)
    ).json();
    return response.sprites;
  }

  async push() {
    await fetch(`http://localhost:${this.portNumber}/${this.project}/push`);
  }

  async unzip() {
    await fetch(`http://localhost:${this.portNumber}/${this.project}/unzip`);
  }
}

/**
 * @param {string} projectName
 * @returns {Project}
 */
function getProject(projectName) {
  return new Project(projectName);
}

/**
 * @param {string} projectFile
 * @returns {Project}
 */
async function createProject(projectFile) {
  // todo
}
