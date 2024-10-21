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
    import Fullscreen from "./icons/Fullscreen.svelte";
    import Download from "./icons/Download.svelte";

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
  window.currentCommit_ = null as unknown as Commit;
  window.scaffold_ = null;

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
          const req = await fetch(`${env.API_URL}/valid_gh_token`, {
            method: "GET",
            headers: { Token: token },
          });
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
      window.currentCommit_ = { message: "Latest commit" } as any;
    }
    window.scaffold_ = await setupScaffolding(parsed.assetFetcher(sha));
    await window.scaffold_.loadProject(projectData);
    document.querySelector("canvas").style.filter = "brightness(50%)";

    const controls = document
      .querySelector(".controls")
      .cloneNode(true) as HTMLElement;
    controls.style.cssText = "";
    document.querySelector(".sc-root").prepend(controls);
    document.querySelector(".sc-root").style.flexDirection = "column";

    setInterval(() => {
      if (!document.fullscreenElement) {
        window.scaffold_.relayout();
      }
    }, 100);
  };
</script>

<main style="flex-direction: column; align-items: center">
  {#if Object.keys(commits).length !== 0}
    <div class="project-commit-viewer">
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
                  window.currentCommit_ = commit;
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
      <span
        style="display: flex; flex-direction: column; width: 150%; align-items: center"
      >
        <div class="controls" style="display: none">
          <span>
            <!-- this is terrible but reduces code duplication -->
            <button
              onclick="document.querySelector('canvas').style.filter = ''; window.scaffold_.start()"
            >
              <Flag />
            </button>
            <button
              onclick="document.querySelector('canvas').style.filter = ''; window.scaffold_.stopAll()"
            >
              <Stop />
            </button>
          </span>
          <span>
            <button
              onclick="document.fullscreenElement ? document.exitFullscreen() : document.querySelector('#project').requestFullscreen()"
            >
              <Fullscreen />
            </button>
            <button
              onclick="window.scaffold_.vm.saveProjectSb3().then(e => {'{'}e;Object.assign(document.createElement('a'), {'{'}href: window.URL.createObjectURL(e),download: {'`$'}{'{'}window.currentCommit_.message.replaceAll(' ', '-'){'}'}.sb3{'`'}{'}'}).click()})"
            >
              <Download />
            </button>
          </span>
        </div>
        <div class="project-viewer" id="project"></div>
      </span>
      {void loadProject("main") ?? ""}
    </div>
  {/if}
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
    justify-content: space-between;
    width: 100%;
    background: #222;
  }

  .controls button {
    /* border-radius: 60%; */
    height: 50px;
    border: none;
    width: 40px;
    background: #222;
    color: white;
  }

  .controls button:hover {
    filter: brightness(110%);
  }

  :global(.controls button svg) {
    transform: scale(0.8);
    margin-top: 3px;
  }
</style>
