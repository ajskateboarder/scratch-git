/// <reference path="global.d.ts" />

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
  format: () => string;
}

export interface GitDetails {
  username: string;
  email: string;
  repository: string;
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
    return commits.map((commit: Commit) => {
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
      .map((e) => ({
        name: e[0],
        isStage: e[1],
        format() {
          return this.name + (this.isStage ? " (stage)" : "");
        },
      })) satisfies Sprite[];
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
  async push(): Promise<string> {
    return (
      await this.request({
        command: "push",
        data: { Project: { project_name: this.projectName } },
      })
    ).status;
  }

  /** Pull upstream changes from the configured remote */
  async pull(): Promise<string> {
    return (
      await this.request({
        command: "pull",
        data: { Project: { project_name: this.projectName } },
      })
    ).status;
  }

  /** Unzip a project from its configured location to get the latest JSON */
  async unzip() {
    await this.request({
      command: "unzip",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Get the origin remote, username, and email for a project */
  async getDetails(): Promise<GitDetails> {
    return await this.request({
      command: "get-project-details",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Set the origin remote, username, and email for a project
   *
   * @returns whether it succeeded or not
   */
  async setDetails(details: GitDetails): Promise<boolean> {
    return await this.request({
      command: "set-project-details",
      data: { GitDetails: { project_name: this.projectName, ...details } },
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
        `An uncaught error has occured. Please check the server logs and <a href="https://github.com/ajskateboarder/scratch-git/issues">make a bug report on GitHub</a>.`
      );
    }

    return new Project(response.project_name, this.ws);
  }

  /** Get the current project based on the project name */
  async getCurrentProject(): Promise<Project | undefined> {
    return new Project(
      window.ReduxStore.getState().scratchGui.projectTitle,
      this.ws
    );
  }
}

export interface DeviceCode {
  user_code: string;
  verification_uri: string;
}

export class GhAuth extends (EventTarget as TypedEventTarget<{
  devicecode: CustomEvent<DeviceCode>;
  login: CustomEvent;
}>) {
  private ws: WebSocket;

  constructor() {
    super();
    this.ws = new WebSocket(SOCKET_URL);
    this.login();
  }

  private login() {
    this.ws.onopen = () => {
      this.ws.send(
        JSON.stringify({
          command: "gh-auth",
          data: {
            Project: { project_name: "" },
          },
        })
      );
    };

    this.ws.onmessage = (message) => {
      let data: { success: true } & DeviceCode = JSON.parse(message.data);
      if (data.success) {
        this.dispatchEvent(new CustomEvent("login"));
      } else {
        this.dispatchEvent(
          new CustomEvent("devicecode", { detail: data as DeviceCode })
        );
      }
    };
  }

  close() {
    this.ws.close();
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
  let ws = new Socket(new WebSocket(SOCKET_URL));
  return ws.request({
    command: "diff",
    data: {
      GitDiff: { old_content: oldScript, new_content: newScript },
    },
  });
}

/** Check if a user-provided Git repository remote exists
 *
 * @param url - the URL of the repository to be checked
 */
export function remoteExists(url: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let ws = new WebSocket(SOCKET_URL);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          command: "remote-exists",
          data: {
            URL: url,
          },
        })
      );
    };
    ws.onmessage = (message) => {
      return resolve(JSON.parse(message.data).exists);
    };
    ws.onerror = (error) => {
      return reject(error);
    };
  });
}

export default new ProjectManager(new WebSocket(SOCKET_URL));
