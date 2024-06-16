import { SOCKET_URL } from "./config";
import { Redux } from "@/lib";

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

interface ProjectCreationDetails {
  username: string;
  email: string;
  projectPath: string;
}

type PullMsg = "success" | "nothing new" | "unrelated histories";
type PushMsg = "success" | "up to date" | "pull needed";

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
  // LINK src-server/handlers.rs#exists
  async exists(): Promise<boolean> {
    return (
      await this.request({
        command: "exists",
        data: { Project: { project_name: this.projectName } },
      })
    ).exists;
  }

  /** Receive all the commits made for a project */
  // LINK src-server/handlers.rs#get-commits
  async getCommits(): Promise<Commit[]> {
    const commits = await this.request({
      command: "get-commits",
      data: { Project: { project_name: this.projectName } },
    });
    return commits.map((commit: Commit) => {
      return {
        ...commit,
        // FIXME: slicing the date like below only works for english
        shortDate: commit.author.date.split(" ").slice(0, 4),
      };
    });
  }

  /** Retreive sprites that have been changed since project changes, sorted alphabetically */
  // LINK src-server/handlers.rs#get-changed-sprites
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
  // LINK src-server/handlers.rs#get-sprite-scripts
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
  // LINK src-server/handlers.rs#get-sprite-scripts
  async getPreviousScripts(sprite: string): Promise<Record<string, string>> {
    return await this.request({
      command: "previous-project",
      data: {
        Project: { project_name: this.projectName, sprite_name: sprite },
      },
    });
  }

  /** Commit the current project to Git */
  // LINK src-server/handlers.rs#commit
  async commit(): Promise<string> {
    return (
      await this.request({
        command: "commit",
        data: { Project: { project_name: this.projectName } },
      })
    ).message;
  }

  /** Push the current project to the configured remote, unused right now */
  // LINK src-server/handlers.rs#push
  async push(): Promise<PushMsg> {
    return (
      await this.request({
        command: "push",
        data: { Project: { project_name: this.projectName } },
      })
    ).status;
  }

  /** Pull upstream changes from the configured remote */
  // LINK src-server/handlers.rs#pull
  async pull(): Promise<PullMsg> {
    return (
      await this.request({
        command: "pull",
        data: { Project: { project_name: this.projectName } },
      })
    ).status;
  }

  /** Unzip a project from its configured location to get the latest JSON */
  // LINK src-server/handlers.rs#unzip
  async unzip() {
    await this.request({
      command: "unzip",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Get the origin remote, username, and email for a project */
  // LINK src-server/handlers.rs#get-project-details
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
  // LINK src-server/handlers.rs#set-project-details
  async setDetails(details: GitDetails): Promise<boolean> {
    return await this.request({
      command: "set-project-details",
      data: { GitDetails: { project_name: this.projectName, ...details } },
    });
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
   * @throws {Error}
   */
  // LINK src-server/handlers.rs#create-project
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
        throw new Error(
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
// LINK src-server/handlers.rs#diff
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
// LINK src-server/handlers.rs#remote-exists
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
