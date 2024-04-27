/** @file A tiny wrapper over the local APIs to work with Git projects */
import { menu } from "./dom/index";

export type Commit = {
  author: { date: string; email: string; name: string };
  body: string;
  commit: string;
  subject: string;
  shortDate: string;
};

const SOCKET_URL = "ws://localhost:8000";

export class Socket extends WebSocket {
  constructor(url: string) {
    super(url);
  }

  receive(): Promise<any> {
    return new Promise((resolve, reject) => {
      this.onmessage = (message) => {
        try {
          let json = JSON.parse(message.data);
          return resolve(json);
        } catch (e: any) {
          console.log(e.stack);
          throw new Error(message.data);
        }
      };

      this.onerror = (error) => {
        return reject(error);
      };
    });
  }

  async request({ command, data }: any) {
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
    let sprites: [string, boolean][] = (
      await this.request({
        command: "get-changed-sprites",
        data: { Project: { project_name: this.projectName } },
      })
    ).sprites;
    return sprites.sort(([a, _b], [b, _c]) => a.localeCompare(b));
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
  constructor(message: string) {
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
          .pop()} is already a project. Either load the existing project or make a copy of the project file.`
      );
    } else if (response.project_name === "fail") {
      throw new Error(
        `An uncaught error has occured. Please check the server logs and <a href="https://github.com/ajskateboarder/scratch-git/issues">file an issue on GitHub</a> with system info.`
      );
    }

    return new Project(response.project_name);
  }

  /** Get the current project based on the project name */
  async getCurrentProject(): Promise<Project | undefined> {
    /** @type {HTMLDivElement} */
    let projectName: string;

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

    return new Project(projectName);
  }
}

export function diff(
  oldContent: string = "",
  newContent: string = ""
): Promise<{ added: number; removed: number; diffed: string }> {
  return new Promise((resolve, reject) => {
    let ws = new WebSocket(SOCKET_URL);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          command: "diff",
          data: {
            GitDiff: { old_content: oldContent, new_content: newContent },
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

export default new ProjectManager(SOCKET_URL);
