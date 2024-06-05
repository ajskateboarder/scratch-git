import { assert, proxy } from "./utils";

const URL_HOSTS = {
  "https://github.com": "GitHub",
};

export interface RepoProvider {
  type: string;
  user: string;
  repo: string;
  commitFetcher(): Promise<Record<string, Commit[]>>;
  assetFetcher(sha): (asset) => string;
  jsonSource(sha): string
}

export interface Commit {
  sha: string;
  author: string;
  message: string;
  date: string;
}

export const parseUrl = (url: string): RepoProvider => {
  const hosts = Object.keys(URL_HOSTS);
  assert(
    hosts.some((e) => url.startsWith(e)),
    "Sorry! This site is not supported (yet)",
  );

  const host: "GitHub" = URL_HOSTS[hosts.find((e) => url.startsWith(e))!];

  if (host === "GitHub") {
    let path = new URL(url).pathname.split("/");
    assert(!path.every((e) => e === ""), "This GitHub URL could not be parsed");
    path = path.filter((e) => e !== "");
    let [user, repo] = path;
    return {
      type: "GitHub",
      user,
      repo,
      commitFetcher: () => gitHubFetcher(user, repo),
      assetFetcher: (sha) => (asset) =>
        `https://raw.githubusercontent.com/${user}/${repo}/${sha}/${asset.assetId}.${asset.dataFormat}`,
      jsonSource: (sha) => `https://raw.githubusercontent.com/${user}/${repo}/${sha}/project.json`
    };
  } else {
    throw new Error();
  }
};

export const gitHubFetcher = async (
  user: string,
  repo: string,
): Promise<Record<string, Commit[]>> => {
  const commitHash = `commits:https://github.com/${user}/${repo}`;

  const cached = localStorage.getItem(commitHash);

  if (cached) {
    try {
      const json = JSON.parse(cached);
      return Promise.resolve(json as Record<string, Commit[]>);
    } catch {
      localStorage.removeItem(commitHash);
    }
  }
  alert("skibidi");

  const response = await (
    await proxy(`https://api.github.com/repos/${user}/${repo}/commits`)
  ).json();

  assert(
    response.message !== "Not Found",
    "This GitHub repository does not exist",
  );

  assert(
    Array.isArray(response) && response.length > 0,
    "This GitHub repository has no commits",
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
    });
    return groups;
  }, {});

  localStorage.setItem(commitHash, JSON.stringify(groups));

  return groups;
};

export const setupScaffolding = (
  assetHost: (asset) => string,
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
    assetHost,
  );
  return scaffolding;
};
