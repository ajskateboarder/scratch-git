import { assert, proxy } from "./utils";

const URL_HOSTS = {
  "https://github.com": "GitHub",
};

export const parseUrl = (
  url: string
): { type: string; [key: string]: string } => {
  const hosts = Object.keys(URL_HOSTS);
  assert(
    hosts.some((e) => url.startsWith(e)),
    "Sorry! This site is not supported (yet)"
  );

  const host: string = URL_HOSTS[hosts.find((e) => url.startsWith(e))!];

  if (host === "GitHub") {
    let path = new URL(url).pathname.split("/");
    assert(!path.every((e) => e === ""), "This GitHub URL could not be parsed");
    path = path.filter((e) => e !== "");
    let [user, repo] = path;
    return { type: "GitHub", user, repo };
  }
};

export type Commit = {
  sha: string;
  author: string;
  message: string;
};

export const fetchGitHubCommits = async (
  user: string,
  repo: string
): Promise<Commit[]> => {
  const response = await (
    await proxy(`https://api.github.com/repos/${user}/${repo}/commits`)
  ).json();

  assert(
    response.message !== "Not Found",
    "This GitHub repository does not exist"
  );

  assert(
    Array.isArray(response) && response.length > 0,
    "This GitHub repository has no commits"
  );

  return response.map((e) => ({
    sha: e.sha,
    author: e.commit.author.name,
    message: e.commit.message,
  }));
};
