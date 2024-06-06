<script lang="ts">
  import {
    parseUrl,
    type Commit,
    setupScaffolding,
    type RepoProvider,
  } from "./lib";

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

  const updateHash = async () => {
    let url = projectInput.value;
    try {
      window.location.hash = url;
      if (url === "") {
        commits = {};
      }
      parsed = parseUrl(url);
      try {
        commits = await parsed.commitFetcher();
      } catch (e) {
        alert(e);
        return;
      }
    } catch {
      console.warn("bad url");
    }
  };

  const updateHashFromEnter = (e: KeyboardEvent) => {
    if (e.key === "Enter") {
      projectInput.blur();
      updateHash();
    }
  };

  const loadProject = async (sha: string) => {
    const projectData = await fetch(parsed.jsonSource(sha)).then((response) =>
      response.text()
    );
    if (sha === "main") {
      currentCommit = { message: "Latest commit" } as any;
    }
    console.log(projectData, parsed.assetFetcher(sha));
    scaffold = await setupScaffolding(parsed.assetFetcher(sha));
    await scaffold.loadProject(projectData);
    document.querySelector("canvas").style.filter = "brightness(50%)";
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
                  Date.parse(commit.date)
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
      on:keydown={updateHashFromEnter}
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
