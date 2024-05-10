import { menu } from "./components/index";

export interface Commit {
  author: { date: string; email: string; name: string };
  body: string;
  commit: string;
  subject: string;
  shortDate: string;
}

export interface Sprite {
  name: string;
  isStage: boolean;
}

const SOCKET_URL = "ws://localhost:8000";

/** Represents a WebSocket interface */
class Socket {
  protected ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  /** Receive the next message or error */
  receive(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ws.onmessage = (message) => {
        try {
          resolve(JSON.parse(message.data));
        } catch (e: any) {
          console.error(e.stack);
          throw new Error(message.data);
        }
      };

      this.ws.onerror = (e) => reject(e);
    });
  }

  /** Make a request with a command and data */
  async request({ command, data }: any) {
    if (this.ws.readyState == this.ws.CONNECTING) {
      this.ws.onopen = () => this.ws.send(JSON.stringify({ command, data }));
    } else {
      this.ws.send(JSON.stringify({ command, data }));
    }

    return await this.receive();
  }
}

/** Represents a connection to interface with a specific project */
export class Project extends Socket {
  projectName: string;

  /** Constructs a project
   *
   * @param projectName - the name of an initialized project
   * @param ws - a WebSocket connection
   */
  constructor(projectName: string, ws: WebSocket) {
    super(ws);
    this.projectName = projectName;
  }

  /** Returns if the project has been linked to scratch.git */
  async exists(): Promise<boolean> {
    return await this.request({
      command: "exists",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Receive all the commits made for a project */
  async getCommits(): Promise<Commit[]> {
    let commits = await this.request({
      command: "get-commits",
      data: { Project: { project_name: this.projectName } },
    });
    return [...commits][0].map((commit: Commit) => {
      return {
        ...commit,
        // FIXME: slicing the date like below fails for langs other than english
        shortDate: commit.author.date.split(" ").slice(0, 4),
      };
    });
  }

  /** Retreive sprites that have been changed since project changes, sorted alphabetically */
  async getSprites() {
    let sprites: [string, boolean][] = (
      await this.request({
        command: "get-changed-sprites",
        data: { Project: { project_name: this.projectName } },
      })
    ).sprites;
    return sprites
      .sort(([a, _b], [b, _c]) => a.localeCompare(b))
      .map((e) => ({ name: e[0], isStage: e[1] }));
  }

  /** Get the current scripts of a project's JSON
   *
   * @param sprite - the name of the sprite you want to receive scripts from
   */
  async getCurrentScripts(sprite: string) {
    return await this.request({
      command: "current-project",
      data: {
        Project: { project_name: this.projectName, sprite_name: sprite },
      },
    });
  }

  /** Get the scripts of a project's JSON before the project was saved
   *
   * @param sprite - the name of the sprite you want to receive scripts from
   */
  async getPreviousScripts(sprite: string) {
    return await this.request({
      command: "previous-project",
      data: {
        Project: { project_name: this.projectName, sprite_name: sprite },
      },
    });
  }

  /** Commit the current project to Git */
  async commit(): Promise<string> {
    return (
      await this.request({
        command: "commit",
        data: { Project: { project_name: this.projectName } },
      })
    ).message;
  }

  /** Push the current project to the configured remote, unused right now */
  async push() {
    await this.request({
      command: "push",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Unzip a project from its configured location to get the latest JSON */
  async unzip() {
    await this.request({
      command: "unzip",
      data: { Project: { project_name: this.projectName } },
    });
  }
}

/** A project with the same name already exists */
export class ProjectExistsException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Represents a connection to fetch and initialize projects */
// class factory jumpscare
class ProjectManager extends Socket {
  constructor(ws: WebSocket) {
    super(ws);
  }

  /** Fetch a project resource using its name
   *
   * @param projectName - the name of a configured project
   */
  async getProject(projectName: string): Promise<Project> {
    return new Project(projectName, this.ws);
  }

  /**
   * Create and initialize a new project
   *
   * @param projectPath - the path to the project SB3
   * @throws {ProjectExistsException | Error}
   */
  async createProject(projectPath: string): Promise<Project> {
    this.ws.send(
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
          .pop()} is already a project. Either load the existing project or make a copy of the project file.`
      );
    } else if (response.project_name === "fail") {
      throw new Error(
        `An uncaught error has occurred. Please check the server logs and <a href="https://github.com/ajskateboarder/scratch-git/issues">file an issue on GitHub</a> with system info.`
      );
    }

    return new Project(response.project_name, this.ws);
  }

  /** Get the current project based on the project name */
  async getCurrentProject(): Promise<Project | undefined> {
    /** @type {HTMLDivElement} */
    let projectName: string;

    // TODO: this is overcomplicated - ReduxStore has a way to fetch this
    if (document.querySelector(`.${menu.menuItem}:nth-child(5)`)) {
      projectName = (
        document.querySelector(`.${menu.menuItem}:nth-child(5)`)?.parentElement
          ?.nextElementSibling?.nextElementSibling?.children[0] as any
      ).value;
    } else {
      const projectNameElement: any = await new Promise((resolve) => {
        const observer = new MutationObserver(() => {
          if (document.querySelector(`.${menu.menuItem}:nth-child(5)`)) {
            observer.disconnect();
            resolve(document.querySelector(`.${menu.menuItem}:nth-child(5)`));
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

    return new Project(projectName, this.ws);
  }
}

/** Diff two scratchblocks scripts and return lines removed and added, and the diffed content
 *
 * @param oldScript - the script for a sprite before a save
 * @param newScript - the script after a save
 */
export function diff(
  oldScript: string,
  newScript: string
): Promise<{ added: number; removed: number; diffed: string }> {
  return new Promise((resolve, reject) => {
    let ws = new WebSocket(SOCKET_URL);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          command: "diff",
          data: {
            GitDiff: { old_content: oldScript, new_content: newScript },
          },
        })
      );
    };
    ws.onmessage = (message) => {
      return resolve(JSON.parse(message.data));
    };
    ws.onerror = (error) => {
      return reject(error);
    };
  });
}

export default new ProjectManager(new WebSocket(SOCKET_URL));
