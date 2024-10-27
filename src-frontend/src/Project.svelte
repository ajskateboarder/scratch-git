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
  import { timeAgo } from "./utils";
  import { onMount } from "svelte";

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
  let turboMode = false;

  let loading = false;
  let initialLoaded = false;

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
    url = url === "" ? window.location.hash.slice(1) : url;
    try {
      if (window.location.hash.slice(1) === url && initialLoaded) {
        return;
      }
      commits = {};
      window.location.hash = url;
      if (url === "") {
        return;
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
        alert(e);
        console.error(e);
        return;
      }
    } catch (e) {
      console.warn(e);
    }
    initialLoaded = true;
  };

  const loadProject = async (sha: string) => {
    loading = true;
    const projectData = await fetch(parsed.jsonSource(sha)).then((response) =>
      response.text(),
    );
    if (sha === "main") {
      currentCommit = { message: "Latest commit" } as any;
    }
    scaffold = await setupScaffolding(parsed.assetFetcher(sha));
    await scaffold.loadProject(projectData);
    document.querySelector("canvas").style.filter = "brightness(50%)";

    document.querySelector(".sc-root .controls")?.remove();
    const controls = document
      .querySelector(".controls")
      .cloneNode(true) as HTMLElement;
    controls.style.cssText = "";
    document.querySelector(".sc-root").prepend(controls);
    document.querySelector(".sc-root").style.flexDirection = "column";
    turboMode = false;
    loading = false;

    document.addEventListener("fullscreenchange", () => {
      if (!document.fullscreenElement) {
        scaffold.relayout();
      }
    });

    // TODO: this could be optimized
    const layers = document.querySelector(".sc-layers") as HTMLElement;
    const controlWidth = parseInt(getComputedStyle(controls).width.slice(0, -2));
    const h = setInterval(() => {
      if (parseInt(layers.style.width.slice(0, -2)) !== controlWidth) {
        scaffold.relayout();
      } else {
        clearInterval(h);
      }
    }, 100);
  };

  window._downloadFromScaffold = async () => {
    const data = await scaffold.vm.saveProjectSb3();
    Object.assign(document.createElement("a"), {
      href: window.URL.createObjectURL(data),
      download: `${currentCommit.message.replaceAll(" ", "-")}.sb3`,
    }).click();
  };

  window._startScaffold = function (e) {
    e.stopPropagation();
    if (e.target.tagName === "SVG") e.target = e.target.parentElement;
    if (e.shiftKey) {
      e.preventDefault();
      turboMode = !turboMode;
      scaffold.vm.setTurboMode(turboMode);
      document.querySelectorAll(".turbo-mode")[1].style.display = turboMode
        ? "block"
        : "none";
      return;
    }
    e.target.classList.add("selected");
    document.querySelector("canvas").style.filter = "";
    scaffold.start();
    scaffold.vm.on("PROJECT_RUN_STOP", () => {
      e.target.classList.remove("selected");
    });
  };

  window._stopScaffold = () => {
    document.querySelector("canvas").style.filter = "";
    scaffold.stopAll();
    document.querySelector(".flag-button").style.cssText = "";
  };

  onMount(async () => {
    await updateHash();
  });
</script>

<main style="flex-direction: column; align-items: center">
  {#if Object.keys(commits).length !== 0 || loading}
    <div class="project-commit-viewer">
      <ul class="project-viewer">
        {#each Object.keys(commits) as commitDate}
          <br />
          <h3>{commitDate}</h3>
          <div class="commit-group">
            {#each commits[commitDate] as commit}
              {@const date = new Date(Date.parse(commit.date))}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <div
                class="commit"
                id={commit.sha}
                role="button"
                tabindex="0"
                on:click|stopPropagation={async (e) => {
                  document
                    .querySelector(".commit.selected")
                    ?.classList.remove("selected");
                  // @ts-ignore
                  document
                    .querySelector(`[id="${commit.sha}"]`)
                    .classList.add("selected");
                  document.querySelector("#project").innerHTML = "";
                  await loadProject(commit.sha);
                  currentCommit = commit;
                }}
              >
                <span
                  ><b>{commit.message}</b><br /><span>
                    {commit.author} committed
                    <span class="info" title={date.toString()}
                      >{timeAgo(date)}</span
                    ></span
                  >
                </span>
                <a
                  href={commit.htmlUrl}
                  target="_blank"
                  on:click|stopPropagation={() => {}}
                  ><i class="fa-solid fa-arrow-up-right-from-square"></i></a
                >
              </div>
            {/each}
          </div>
        {/each}
      </ul>
      <span
        style="display: flex; flex-direction: column; width: 150%; align-items: center"
      >
        {#if loading}<span>
          <span><svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
            <circle class="path" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
         </svg></span>
          </span>{/if}
        <div class="controls" style="display: none">
          <span style="display: flex; align-items: center">
            <!-- inline click handlers are necessary to copy over the control bar into the scaffold without issues -->
            <button onclick="window._startScaffold(event)" class="flag-button">
              <Flag />
              <i
                class="fa-solid fa-bolt fa-lg turbo-mode"
                style="display: none; position: absolute"
              ></i>
            </button><button onclick="window._stopScaffold()">
              <Stop />
            </button>
          </span>
          <span style="display: flex; align-items: center">
            <button onclick="window._downloadFromScaffold()">
              <Download />
            </button><button
              onclick="document.fullscreenElement ? document.exitFullscreen() : document.querySelector('#project').requestFullscreen()"
            >
              <Fullscreen />
            </button>
          </span>
        </div>
        <div
          class="project-viewer"
          id="project"
          style="display: {loading ? 'none' : 'block'}; overflow: hidden"
        ></div>
      </span>
      {void loadProject("main") ?? ""}
    </div>
  {:else}
    <span><svg class="spinner" width="65px" height="65px" viewBox="0 0 66 66" xmlns="http://www.w3.org/2000/svg">
      <circle class="path" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round" cx="33" cy="33" r="30"></circle>
   </svg></span>
  {/if}
  <br />
  <div class="project-input-wrapper">
    {#if Object.keys(commits).length !== 0}
      <a
        class="close-button"
        href={initialUrl}
        target="blank"
        style="color: inherit"
        ><i class="fa-solid fa-arrow-up-right-from-square"></i></a
      >
    {/if}
    <input
      type="text"
      class="project-input"
      placeholder="https://linkto.repo/user/repository"
      on:focus={(e) => {
        // @ts-ignore
        e.target.select();
      }}
      on:blur={updateHash}
      bind:this={projectInput}
      value={initialUrl}
    />
  </div>
</main>

<style>
  .project-input-wrapper {
    display: flex;
    width: 100%;
    align-items: center;
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
    align-items: center;
    padding: 10px;
  }

  .commit {
    width: 100%;
    text-align: left;
    padding: 5px;
    font-size: small;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .commit .info {
    font-size: smaller;
  }

  .commit:not(.selected):hover {
    background-color: #f1f1f1;
  }

  :global(.commit.selected) {
    background-color: #999;
  }

  .project-commit-viewer .project-viewer {
    overflow: auto;
    width: 70%;
    height: 422px;
    list-style-position: inside;
    padding-left: 0;
  }

  .controls {
    display: flex;
    justify-content: space-between;
    width: 100%;
    background: #f1f1f1;
    color: black;
    flex-wrap: wrap;
    border-top-right-radius: 5px;
    border-top-left-radius: 5px;
  }

  :global(.sc-layers) {
    border: 1px solid #f1f1f1;
  }

  .controls button {
    height: 100%;
    border: none;
    width: 40px;
    background: none;
    cursor: pointer;
  }

  .controls button:hover {
    background: #999;
  }

  .controls button:active,
  :global(.controls button.selected) {
    background: #888 !important;
  }

  :global(.controls button svg) {
    transform: scale(0.8);
    margin-top: 3px;
  }

  .turbo-mode {
    position: absolute;
    top: 22px;
    right: 1px;
  }

  .info {
    cursor: pointer;
  }

  .info:hover {
    border-bottom: 0.1px dashed;
  }
</style>
