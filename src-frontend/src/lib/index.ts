import { assert, wrapProxy } from "../utils";
import env from "./env"

const URL_HOSTS = {
  "https://github.com/": "GitHub",
  "https://scratchgit.glitch.me/": "ScratchGit",
} as const;

export interface RepoProvider {
  type: typeof URL_HOSTS[keyof typeof URL_HOSTS];
  user: string;
  repo: string;
  commitFetcher(token: string | undefined): Promise<Record<string, Commit[]>>;
  assetFetcher(sha: string): (asset: any) => string;
  jsonSource(sha: string): string;
}

export interface Commit {
  sha: string;
  author: string;
  message: string;
  date: string;
  htmlUrl: string;
}

export const parseUrl = (url: string): RepoProvider => {
  const hosts = Object.keys(URL_HOSTS);
  assert(
    hosts.some((e) => url.startsWith(e)),
    "Sorry! This site is not supported (yet)"
  );

  const host = URL_HOSTS[hosts.find((e) => url.startsWith(e))!];
  let path = new URL(url).pathname.split("/");
  assert(!path.every((e) => e === ""), "This Git URL could not be parsed");
  path = path.filter((e) => e !== "");
  let [user, repo] = path;

  if (host === "GitHub") {
    return {
      type: host,
      user,
      repo,
      commitFetcher: (token: string) => gitHubFetcher(user, repo, token),
      assetFetcher: (sha) => (asset) =>
        `https://raw.githubusercontent.com/${user}/${repo}/${sha}/${asset.assetId}.${asset.dataFormat}`,
      jsonSource: (sha) =>
        `https://raw.githubusercontent.com/${user}/${repo}/${sha}/project.json`,
    };
  } else if (host === "ScratchGit") {
    return {
      type: host,
      user,
      repo,
      commitFetcher: () => scratchGitFetcher(user, repo),
      assetFetcher: (sha) => (asset) =>
        sha === "main"
          ? wrapProxy(
            `https://scratchgit.glitch.me/${user}/${repo}/raw/branch/master/${asset.assetId}.${asset.dataFormat}`
          )
          : wrapProxy(
            `https://scratchgit.glitch.me/${user}/${repo}/raw/commit/${sha}/${asset.assetId}.${asset.dataFormat}`
          ),
      jsonSource: (sha) =>
        sha === "main"
          ? wrapProxy(
            `https://scratchgit.glitch.me/${user}/${repo}/raw/branch/master/project.json`
          )
          : wrapProxy(
            `https://scratchgit.glitch.me/${user}/${repo}/raw/commit/${sha}/project.json`
          ),
    };
  } else {
    throw new Error();
  }
};

export const scratchGitFetcher = async (
  user: string,
  repo: string
): Promise<Record<string, Commit[]>> => {
  const commitHash = `commits:scratchgit/${user}/${repo}`;
  const cached = localStorage.getItem(commitHash);

  if (cached) {
    try {
      const json = JSON.parse(cached);
      return Promise.resolve(json as Record<string, Commit[]>);
    } catch {
      localStorage.removeItem(commitHash);
    }
  }

  const response = await (await fetch(`${env.API_URL}/commits`, {
    body: JSON.stringify({
      kind: "scratchgitglitch",
      user,
      repo,
    })
  })).json();

  assert(
    response.message !== "The target couldn't be found.",
    "This ScratchGit repository does not exist"
  );

  assert(
    Array.isArray(response) && response.length > 0,
    "This ScratchGit repository has no commits"
  );

  const groups = response.reduce((groups, e) => {
    const date = e.commit.author.date.split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({
      sha: e.sha,
      author: e.commit.author.name,
      message: e.commit.message,
      date: e.commit.author.date,
      htmlUrl: `https://scratchgit.glitch.me/${user}/${repo}/commit/${e.sha}`,
    });
    return groups;
  }, {});

  localStorage.setItem(commitHash, JSON.stringify(groups));

  return groups;
};

export const gitHubFetcher = async (
  user: string,
  repo: string,
  token: string,
): Promise<Record<string, Commit[]>> => {
  const response_ = await fetch(`${env.API_URL}/commits`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      kind: {
        github: token
      },
      user,
      repo,
    })
  });

  const response = await response_.json();

  assert(
    response.message !== "Not Found",
    "This GitHub repository does not exist"
  );

  assert(
    Array.isArray(response) && response.length > 0,
    "This GitHub repository has no commits"
  );

  const groups = response.reduce((groups, e) => {
    const date = e.commit.author.date.split("T")[0];
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push({
      sha: e.sha,
      author: e.commit.author.name,
      message: e.commit.message,
      date: e.commit.author.date,
      htmlUrl: `https://github.com/${user}/${repo}/commit/${e.sha}`,
    });
    return groups;
  }, {});

  return groups;
};

export const setupScaffolding = (
  assetHost: (asset: any) => string
): Promise<any> => {
  const scaffolding = new (window as any).Scaffolding.Scaffolding();

  scaffolding.width = 480;
  scaffolding.height = 360;
  scaffolding.resizeMode = "preserve-ratio";
  scaffolding.editableLists = false;

  scaffolding.setup();

  scaffolding.appendTo(document.getElementById("project"));

  const storage = scaffolding.storage;
  storage.addWebStore(
    [
      storage.AssetType.ImageVector,
      storage.AssetType.ImageBitmap,
      storage.AssetType.Sound,
    ],
    assetHost
  );
  return scaffolding;
};
