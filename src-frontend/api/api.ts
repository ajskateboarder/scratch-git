import { ProjectJSON } from "@/diff-indicators/script-parser";
import { SOCKET_URL } from "./url";
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
  format(): string;
}

export interface GitDetails {
  username: string;
  email: string;
  repository: string;
}

export interface CostumeChange {
  name: string;
  path: string;
  ext: string;
  onStage: boolean;
  sprite: string;
  kind: "before" | "after";
  contents: number[];
}

interface ProjectCreationDetails {
  username: string;
  email: string;
  projectPath: string;
}

export type PullMsg = "success" | "nothing new" | "unrelated histories";
export type PushMsg = "success" | "up to date" | "pull needed";

/** Represents a WebSocket interface */
class Socket {
  private static lastRequest: {
    request: { command: any; data: any };
    response: any;
  } = {
    request: { command: null, data: null },
    response: null,
  };

  constructor(protected ws: WebSocket) {}

  /** Receive the next message or error */
  receive(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.ws.onmessage = (message) => {
        try {
          console.debug("message", message.data);
          const json = JSON.parse(message.data);
          if (json["unhandled-error"]) {
            alert(
              `An unhandled error occurred. Please check the console for errors using Ctrl+Shift+I.`
            );
            console.error(
              `The following error "${json["unhandled-error"]}" occurred. Please report this issue using GitHub: https://github.com/ajskateboarder/scratch-git/issues or Scratch: https://scratch.mit.edu/users/ajskateboarder#comments`
            );
            return;
          }
          Socket.lastRequest.response = json;
          resolve(json);
        } catch (e: any) {
          console.error(e.stack);
          throw new Error(message.data);
        }
      };

      this.ws.onerror = (e) => reject(e);
    });
  }

  /** Make a request with a command and data */
  async request(request: any) {
    if (
      JSON.stringify(Socket.lastRequest.request) === JSON.stringify(request)
    ) {
      return await Socket.lastRequest.response;
    }
    Socket.lastRequest.request = request;
    if (this.ws.readyState == WebSocket.CONNECTING) {
      this.ws.onopen = () => this.ws.send(JSON.stringify(request));
    } else {
      this.ws.send(JSON.stringify(request));
    }
    return await this.receive();
  }
}

export class Project extends Socket {
  /** Constructs a project */
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
  async getChangedSprites() {
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

  // LINK src-server/handlers.rs#get-changed-costumes
  async getChangedAssets(): Promise<
    Record<string, Record<string, CostumeChange[]>>
  > {
    return (
      await this.request({
        command: "get-changed-assets",
        data: { Project: { project_name: this.projectName } },
      })
    ).data;
  }

  /** Get the current scripts of a project's JSON */
  // LINK src-server/handlers.rs#get-sprite-scripts
  async getCurrentScripts(sprite: string) {
    return new ProjectJSON(
      await this.request({
        command: "current-project",
        data: {
          Project: { project_name: this.projectName, sprite_name: sprite },
        },
      })
    );
  }

  /** Get the scripts of a project's JSON before the project was saved */
  // LINK src-server/handlers.rs#get-sprite-scripts
  async getPreviousScripts(sprite: string) {
    return new ProjectJSON(
      await this.request({
        command: "previous-project",
        data: {
          Project: { project_name: this.projectName, sprite_name: sprite },
        },
      })
    );
  }

  /** Commit the current project to Git */
  // LINK src-server/handlers.rs#commit
  async commit(): Promise<string | number> {
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

  /** Pull upstream changes from the configured remote
   *
   * May prompt user for username/password in terminal before responding */
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
  unzip() {
    return this.request({
      command: "unzip",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Get the origin remote, username, and email for a project */
  // LINK src-server/handlers.rs#get-project-details
  getDetails(): Promise<GitDetails> {
    return this.request({
      command: "get-project-details",
      data: { Project: { project_name: this.projectName } },
    });
  }

  /** Set the origin remote, username, and email for a project
   *
   * @returns whether it succeeded or not
   */
  // LINK src-server/handlers.rs#set-project-details
  setDetails(details: GitDetails): Promise<boolean> {
    return this.request({
      command: "set-project-details",
      data: { GitDetails: { project_name: this.projectName, ...details } },
    });
  }

  /** Check whether the user can commit or not and how many commits ahead the user is */
  // LINK src-server/handlers.rs#repo-status
  async repoStatus(): Promise<{ status: number; commits_ahead: number }> {
    return await this.request({
      command: "repo-status",
      data: { Project: { project_name: this.projectName } },
    });
  }
}

/** Represents a connection to fetch and initialize projects */
// class factory jumpscare
export class ProjectManager extends Socket {
  constructor(ws: WebSocket) {
    super(ws);
  }

  async getProject(projectName: string): Promise<Project> {
    return new Project(projectName, this.ws);
  }

  /**
   * Create a new project
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
  getCurrentProject(): Project | undefined {
    return new Project(Redux.getState().scratchGui.projectTitle, this.ws);
  }
}

/** Diff two scratchblocks scripts and return lines removed and added, and the diffed content
 *
 * @param oldScript - the script for a sprite before a save, default is empty string
 * @param newScript - the script after a save
 */
// LINK src-server/handlers.rs#diff
export const diff = (
  projectName: string,
  oldScript: string = "",
  newScript: string
): Promise<{ added: number; removed: number; diffed: string }> => {
  const ws = new Socket(new WebSocket(SOCKET_URL));
  return ws.request({
    command: "diff",
    data: {
      GitDiff: {
        project_name: projectName,
        old_content: oldScript,
        new_content: newScript,
      },
    },
  });
};

// LINK src-server/handlers.rs#clone
export const cloneRepo = (url: string) => {
  const ws = new Socket(new WebSocket(SOCKET_URL));
  return ws.request({
    command: "clone-repo",
    data: {
      URL: url,
    },
  });
};

/** Check if a user-provided Git repository remote exists */
// LINK src-server/handlers.rs#remote-exists
export const remoteExists = async (url: string): Promise<boolean> => {
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

export const uninstall = async () => {
  const ws = new Socket(new WebSocket(SOCKET_URL));
  return !!ws.request({
    command: "uninstall",
    data: { Project: { project_name: "" } },
  });
};
