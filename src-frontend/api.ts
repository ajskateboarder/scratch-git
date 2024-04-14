/** @file A tiny wrapper over the local APIs to work with Git projects */
import { Cmp } from "./dom/index";

export type Commit = {
  author: { date: string; email: string; name: string };
  body: string;
  commit: string;
  subject: string;
  shortDate: string;
};

enum Var {
  Project,
  GitDiff,
  FilePath,
}

type Command<T extends Var> = {
  command: {
    [Var.GitDiff]: "diff";
    [Var.FilePath]: "create-project";
    [Var.Project]:
      | "exists"
      | "unzip"
      | "commit"
      | "push"
      | "current-project"
      | "previous-project"
      | "get-commits"
      | "get-changed-sprites";
  }[T];
  data: {
    [Var.GitDiff]: { GitDiff: { old_content: string; new_content: string } };
    [Var.FilePath]: { FilePath: { file_name: string } };
    [Var.Project]: { Project: { project_name: string; sprite_name?: string } };
  }[T];
};

const SOCKET_URL = "ws://localhost:8000";

export class Socket extends WebSocket {
  constructor(url: string) {
    super(url);
  }

  receive(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.onmessage = (message) => {
        return resolve(JSON.parse(message.data));
      };

      this.onerror = (error) => {
        return reject(error);
      };
    });
  }

  async request<T extends Var>({ command, data }: Command<T>) {
    if (this.readyState == this.CONNECTING) {
      this.onopen = () => this.send(JSON.stringify({ command, data }));
    } else {
      this.send(JSON.stringify({ command, data }));
    }

    return await this.receive();
  }
}

export class Project extends Socket {
  projectName: string;

  /** Constructs a project */
  constructor(projectName: string) {
    super(SOCKET_URL);
    this.projectName = projectName;
  }

  /** Returns if the project has been linked to scratch.git */
  async exists(): Promise<boolean> {
    return await this.request({
      command: "exists",
      data: { Project: { project_name: this.projectName } },
    });
  }

  async getCommits(): Promise<Commit[]> {
    let commits = await this.request({
      command: "get-commits",
      data: { Project: { project_name: this.projectName } },
    });
    return [...commits][0].map((commit: Commit) => {
      return {
        ...commit,
        shortDate: commit.author.date.split(" ").slice(0, 4),
      };
    });
  }

  /** Retreive sprites that have been changed since project changes, sorted alphabetically*/
  async getSprites(): Promise<[string, boolean][]> {
    /** @type {[string, boolean][]} */
    let sprites = (
      await this.request({
        command: "get-changed-sprites",
        data: { Project: { project_name: this.projectName } },
      })
    ).sprites;
    return sprites.sort((a, b) => a[0].localeCompare(b[0]));
  }

  async getCurrentScripts(sprite: string) {
    return await this.request({
      command: "current-project",
      data: {
        Project: { project_name: this.projectName, sprite_name: sprite },
      },
    });
  }

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

  async push() {
    await this.request({
      command: "push",
      data: { Project: { project_name: this.projectName } },
    });
  }

  async unzip() {
    await this.request({
      command: "unzip",
      data: { Project: { project_name: this.projectName } },
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
class ProjectManager extends Socket {
  constructor(url: string) {
    super(url);
  }

  async getProject(projectName: string): Promise<Project> {
    return new Project(projectName);
  }

  /**
   * Create and git-init a new project
   * @throws {ProjectExistsException}
   */
  async createProject(projectPath: string): Promise<Project> {
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

    return new Project(response.project_name);
  }

  /** Get the current project based on the project name */
  async getCurrentProject(): Promise<Project | undefined> {
    /** @type {HTMLDivElement} */
    let projectName: string;

    if (document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`)) {
      projectName = (
        document.querySelector(`.${Cmp.MENU_ITEM}:nth-child(5)`)?.parentElement
          ?.nextElementSibling?.nextElementSibling?.children[0] as any
      ).value;
    } else {
      const projectNameElement: any = await new Promise((resolve) => {
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

    return new Project(projectName);
  }
}

export default new ProjectManager(SOCKET_URL);
