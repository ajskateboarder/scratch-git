<script lang="ts">
  import Project from "./Project.svelte";

  import logo from "/logo.svg";
  import lightDiff from "/light-diff.mp4";
  import darkDiff from "/dark-diff.mp4";
  import { onMount } from "svelte";

  let lightDiffVideo: HTMLVideoElement;
  let darkDiffVideo: HTMLVideoElement;
  let hash = "";

  const playOnHover = (video: HTMLVideoElement) => {
    Object.assign(video, {
      onmouseover: () => video.play(),
      onmouseleave: () => video.pause(),
    });
  };

  const routeChange = () => {
    let url = window.location.hash.substring(1);
    if (url === "") {
      hash = "";
    }
    try {
      new URL(url);
      hash = url;
    } catch {
      console.warn("bad url");
    }
  };

  onMount(() => {
    playOnHover(lightDiffVideo);
    playOnHover(darkDiffVideo);
    routeChange();
  });
</script>

<svelte:window on:hashchange={routeChange} />

<header>
  <h1>
    <img src={logo} alt="scratch.git logo" width="70" />
    <span style="font-size: 40px;">scratch.git</span>
  </h1>
  <p>
    scratch.git provides a way to view/track your project's changes, revert to
    previous versions, and collaborate more efficiently from TurboWarp Desktop.
    Enter a URL below to view project versions.
  </p>
</header>
<Project initialUrl={hash}></Project>
<details>
  <summary class="kinda-big"> <span>Diffing</span> </summary>
  <div style="display: flex; flex-wrap: wrap">
    <video loop muted height="230" bind:this={lightDiffVideo}>
      <source src={lightDiff} />
    </video>
    <video loop muted height="230" bind:this={darkDiffVideo}>
      <source src={darkDiff} />
    </video>
  </div>
</details>
<footer>
  <br />
  scratch.git is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation.
  <br />
  <a href="https://github.com/ajskateboarder/scratch-git" target="_blank"
    >source code</a
  >
</footer>
