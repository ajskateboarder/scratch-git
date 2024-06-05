<script lang="ts">
  import { onMount } from "svelte";
  import { fetchGitHubCommits, parseUrl, type Commit } from "./parse";

  export let initialUrl: string;

  try {
    new URL(initialUrl);
  } catch {
    initialUrl = "";
    console.warn("bad url");
  }

  let projectInput: HTMLInputElement;
  let commits: Commit[] = [];

  const updateHash = async () => {
    let url = projectInput.value;
    try {
      window.location.hash = url;
      const parsed = parseUrl(url);
      try {
        if (parsed.type === "GitHub") {
          commits = await fetchGitHubCommits(parsed.user, parsed.repo);
        }
      } catch (e) {
        alert(e);
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

  onMount(async () => {
    const scaffolding = new (window as any).Scaffolding.Scaffolding();
    scaffolding.width = 480; // Custom stage width
    scaffolding.height = 360; // Custom stage height
    scaffolding.resizeMode = "preserve-ratio"; // or 'dynamic-resize' or 'stretch'
    scaffolding.editableLists = false; // Affects list monitors
    scaffolding.setup();
    const storage = scaffolding.storage;
    storage.addWebStore(
      [
        storage.AssetType.ImageVector,
        storage.AssetType.ImageBitmap,
        storage.AssetType.Sound,
      ],
      (asset) =>
        `https://raw.githubusercontent.com/themysticsavages/scratch-git-test/main/${asset.assetId}.${asset.dataFormat}`
    );
    console.log(storage, storage.addWebStore);

    scaffolding.appendTo(document.getElementById("project"));
    const projectData = await fetch(
      `https://raw.githubusercontent.com/themysticsavages/scratch-git-test/main/project.json`
    ).then((response) => response.text());
    scaffolding
      .loadProject(projectData)
      .then(() => {
        console.log("e");
        scaffolding.start();
      })
      .catch((error) => {
        console.log(error);
      });
  });
</script>

<main style="flex-direction: column; align-items: center">
  <div class="project-commit-viewer">
    {#if commits.length !== 0}
      <ul class="project-viewer">
        <input type="text" class="commit-input" />
        {#each commits as commit}
          <button title={commit.sha}>{commit.message}</button>
          <br />
        {/each}hello
      </ul>
    {/if}
    <div class="project-viewer" id="project"></div>
  </div>

  <br />
  <input
    type="text"
    class="project-input"
    placeholder="https://linkto.repo/user/repository"
    on:blur={updateHash}
    on:keydown={updateHashFromEnter}
    bind:this={projectInput}
    value={initialUrl}
  />
</main>
