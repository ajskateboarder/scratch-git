import { SOCKET_URL } from "./config";
import { Redux } from "@/lib";

export interface Commit {
  readonly author: { date: string; email: string; name: string };
  readonly body: string;
  readonly commit: string;
  readonly subject: string;
  readonly shortDate: string;
}

export interface Sprite {
  readonly name: string;
  readonly isStage: boolean;
  readonly format: () => string;
}

export interface GitDetails {
  readonly username: string;
  readonly email: string;
  readonly repository: string;
}

interface ProjectCreationDetails {
  username: string;
  email: string;
  projectPath: string;
}

type PullMessage = "success" | "nothing new" | "unrelated histories";
type PushMessage = "success" | "up to date" | "pull needed";

/** Represents a WebSocket interface */
class Socket {
  constructor(protected ws: WebSocket) {}

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
    if (this.ws.readyState == WebSocket.CONNECTING) {
      this.ws.onopen = () => this.ws.send(JSON.stringify({ command, data }));
    } else {
      this.ws.send(JSON.stringify({ command, data }));
    }

    return await this.receive();
  }
}

/** Represents a connection to interface with a specific project */
export class Project extends Socket {
  /** Constructs a project
   *
   * @param projectName - the name of an initialized project
   * @param ws - a WebSocket connection
   */
  constructor(public projectName: string, protected ws: WebSocket) {
    super(ws);
  }

  /** Returns if the project has been linked to scratch.git */
  async exists(): Promise<boolean> {
    console.log(
      await this.request({
        command: "exists",
        data: { Project: { project_name: this.projectName } },
      })
    );
    return (
      await this.request({
        command: "exists",
        data: { Project: { project_name: this.projectName } },
      })
    ).exists;
  }

  /** Receive all the commits made for a project */
  async getCommits(): Promise<Commit[]> {
    const commits = await this.request({
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
    const sprites: [string, boolean][] = (
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
  async push(): Promise<PushMessage> {
    return (
      await this.request({
        command: "push",
        data: { Project: { project_name: this.projectName } },
      })
    ).status;
  }

  /** Pull upstream changes from the configured remote */
  async pull(): Promise<PullMessage> {
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

// TODO: use something better instead of stupid errors

/** A project with the same name already exists */
export class ProjectExistsException extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

/** Represents a connection to fetch and initialize projects */
// class factory jumpscare
export class ProjectManager extends Socket {
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
   * @param info - the path to the project SB3 and the user's chosen name and email
   * @throws {ProjectExistsException | Error}
   */
  async createProject({
    projectPath,
    username,
    email,
  }: ProjectCreationDetails): Promise<Project> {
    this.ws.send(
      JSON.stringify({
        command: "create-project",
        data: {
          ProjectToCreate: {
            file_path: projectPath,
            username,
            email,
          },
        },
      })
    );

    const response = await this.receive();
    if (response.status) {
      if (response.status === "exists") {
        throw new ProjectExistsException(
          `${projectPath
            .split("/")
            .pop()} is already a project. Either load the existing project or make a copy of the project file.`
        );
      } else if (response.status === "fail") {
        throw new Error(
          "An uncaught error has occurred. Please check your server's logs and make a bug report at https://github.com/ajskateboarder/scratch-git/issues."
        );
      }
    }

    return new Project(response.project_name, this.ws);
  }

  /** Get the current project based on the project name */
  async getCurrentProject(): Promise<Project | undefined> {
    return new Project(Redux.getState().scratchGui.projectTitle, this.ws);
  }
}

/** Diff two scratchblocks scripts and return lines removed and added, and the diffed content
 *
 * @param oldScript - the script for a sprite before a save
 * @param newScript - the script after a save
 */
export const diff = (
  oldScript: string,
  newScript: string
): Promise<{ added: number; removed: number; diffed: string }> => {
  const ws = new Socket(new WebSocket(SOCKET_URL));
  return ws.request({
    command: "diff",
    data: {
      GitDiff: { old_content: oldScript, new_content: newScript },
    },
  });
};

/** Check if a user-provided Git repository remote exists
 *
 * @param url - the URL of the repository to be checked
 */
export const remoteExists = (url: string): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SOCKET_URL);

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
};
