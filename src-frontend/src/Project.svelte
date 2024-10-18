<script lang="ts">
  import {
    parseUrl,
    type Commit,
    setupScaffolding,
    type RepoProvider,
  } from "./lib/index";
  import env from "./lib/env";

  import Flag from "./icons/Flag.svelte";
  import Stop from "./icons/Stop.svelte";

  export let initialUrl: string;

  try {
    new URL(initialUrl);
  } catch {
    initialUrl = "";
    console.warn("bad url");
  }

  let projectInput: HTMLInputElement;
  let commits: Record<string, Commit[]> = {};
  let parsed: RepoProvider;
  let currentCommit: Commit;
  let scaffold: any;

  const parseCookie = <T extends Record<string, string | null>>(str: string) =>
    str
      .split(";")
      .map((v) => v.split("="))
      .reduce((acc, v) => {
        acc[decodeURIComponent(v[0].trim())] = decodeURIComponent(v[1].trim());
        return acc;
      }, {}) as T;

  const authGitHub = () => {
    if (
      confirm(
        "You must sign in with GitHub to work with GitHub projects. Continue?",
      )
    ) {
      const child = window.open(
        `https://github.com/login/oauth/authorize?client_id=${env.GH_CLIENT_ID}`,
        "popup",
        "width=600,height=400",
      );
      const poll = setInterval(() => {
        if (child.closed) {
          window.location.reload();
          clearInterval(poll);
        }
      }, 500);
    }
  };

  const updateHash = async () => {
    let url = projectInput.value;
    try {
      window.location.hash = url;
      if (url === "") {
        commits = {};
      }
      parsed = parseUrl(url);
      let token: string;
      if (parsed.type === "GitHub") {
        if (document.cookie === "") {
          authGitHub();
          return;
        }
        token = parseCookie<{ token: string }>(document.cookie).token;
        if (token) {
          token = token.slice(1, token.length - 1);
          const req = await fetch(
            `${env.API_URL}/valid_gh_token`,
            { method: "POST", headers: { Token: token } },
          );
          if (req.status === 400) {
            authGitHub();
            return;
          }
        }
      }
      try {
        commits = await parsed.commitFetcher(token);
      } catch (e) {
        console.error(e);
        return;
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const loadProject = async (sha: string) => {
    const projectData = await fetch(parsed.jsonSource(sha)).then((response) =>
      response.text(),
    );
    if (sha === "main") {
      currentCommit = { message: "Latest commit" } as any;
    }
    scaffold = await setupScaffolding(parsed.assetFetcher(sha));
    await scaffold.loadProject(projectData);
    document.querySelector("canvas").style.filter = "brightness(50%)";
    setInterval(() => {
      if (!document.fullscreenElement) {
        scaffold.relayout();
      }
    }, 100)
  };
</script>

<main style="flex-direction: column; align-items: center">
  <div class="project-commit-viewer">
    {#if Object.keys(commits).length !== 0}
      <ul class="project-viewer">
        {#each Object.keys(commits) as commitDate}
          <br />
          <h3>{commitDate}</h3>
          <div class="commit-group">
            {#each commits[commitDate] as commit}
              <button
                class="commit"
                title={commit.sha}
                on:click={async (e) => {
                  document
                    .querySelector(".selected")
                    ?.classList.remove("selected");
                  // @ts-ignore
                  e.target.classList.add("selected");
                  document.querySelector("#project").innerHTML = "";
                  await loadProject(commit.sha);
                  currentCommit = commit;
                }}
                ><b>{commit.message}</b><br />{commit.author} - {new Date(
                  Date.parse(commit.date),
                )
                  .toISOString()
                  .slice(11, -1)
                  .slice(0, -4)} -
                <button
                  on:click|stopPropagation={() => window.open(commit.htmlUrl)}
                  ><i class="fa-solid fa-arrow-up-right-from-square"
                  ></i></button
                ></button
              >
            {/each}
          </div>
        {/each}
      </ul>

      <div class="project-viewer" id="project"></div>
      <div class="controls">
        <button
          on:click={async () => {
            document.querySelector("canvas").style.filter = "";
            await scaffold.start();
          }}
        >
          <Flag />
        </button>
        <button on:click={async () => await scaffold.stopAll()}>
          <Stop />
        </button>
        <button
          on:click={async () =>
            document.querySelector("#project").requestFullscreen()}
        >
          <i class="fa-solid fa-expand" style="font-size: 30px"></i>
        </button>
        <button
          on:click={async () => {
            Object.assign(document.createElement("a"), {
              href: URL.createObjectURL(await scaffold.vm.saveProjectSb3()),
              download: `${currentCommit.message.replaceAll(" ", "-")}.sb3`,
            }).click();
          }}
        >
          <i class="fa-solid fa-download" style="font-size: 30px"></i>
        </button>
      </div>
      {void loadProject("main") ?? ""}
    {/if}
  </div>
  <br />
  <div class="project-input-wrapper">
    <input
      type="text"
      class="project-input"
      placeholder="https://linkto.repo/user/repository"
      on:blur={updateHash}
      bind:this={projectInput}
      value={initialUrl}
    />
    {#if Object.keys(commits).length !== 0}
      <button
        class="close-button"
        on:click={() => {
          window.location.hash = "";
          commits = {};
        }}>×</button
      >
    {/if}
  </div>
</main>

<style>
  .project-input-wrapper {
    display: flex;
    width: 100%;
    justify-content: center;
  }

  .close-button {
    padding: 5px;
  }

  .project-input {
    border: none;
    width: 75%;
    font-size: 23px;
    line-height: 32px;
    margin-top: 5px;
    background-color: transparent;
  }

  :global(.project-input) :focus {
    color: white !important;
  }

  .project-commit-viewer {
    display: flex;
    width: 100%;
    align-items: center;
    border: 1px solid black;
    border-radius: 5px;
    padding: 10px;
  }

  .commit {
    width: 100%;
    text-align: left;
  }

  :global(.commit.selected) {
    filter: invert(100%);
  }

  .project-commit-viewer .project-viewer {
    overflow: auto;
    width: 75%;
    height: 422px;
  }

  .controls {
    display: flex;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    padding-left: 10px;
  }

  .controls button {
    border-radius: 60%;
    height: 50px;
    border: none;
    width: 50px;
  }

  .controls button:hover {
    filter: brightness(110%);
  }

  :global(.controls button svg) {
    transform: scale(0.8);
    margin-top: 3px;
  }
</style>
