<script lang="ts">
  import Compare from "./lib/components/Compare.svelte";
  import Project from "./lib/components/Project.svelte";

  import logo from "/favicon.svg";
  import { onMount } from "svelte";

  let hash = "";

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
    routeChange();
  });
</script>

<svelte:window on:hashchange={routeChange} />
<Compare></Compare>

<header>
  <h1>
    <img src={logo} alt="scratch.git logo" width="70" />
    <span style="font-size: 40px;">scratch.git</span>
  </h1>
</header>
<Project initialUrl={hash}></Project>
<p>
  scratch.git provides a way to view/track your project's changes, revert to
  previous versions, and collaborate more efficiently from TurboWarp Desktop.
  Enter a URL below to view project versions. Please note that you must install
  scratch.git in order to contribute to projects.
</p>
<h2 id="installing">Installing</h2>
<p>
  First install <a href="https://desktop.turbowarp.org">TurboWarp Desktop</a>
  and <a href="https://git-scm.com/download">Git</a>, then download
  <a href="https://github.com/ajskateboarder/scratch-git/releases"
    >scratch.git</a
  > (scratch-git_win.zip for Windows, scratch-git_darwin_amd64.zip for MacOS).
</p>
<p>
  Then extract the zip/tar file and run the scratch-git file. If you get a
  SmartScreen alert on Windows, you can safely ignore it.
</p>
<footer>
  <hr />
  <br />
  scratch.git is not affiliated with Scratch, the Scratch Team, or the Scratch Foundation.
  <br />
  Flag/stop/fullscreen icons are used under the derived
  <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/deed.en"
    >CC By-SA license.</a
  >
  <br /><br />
  <a href="https://github.com/ajskateboarder/scratch-git">source code</a> •
  <a href="/privacy.html">privacy policy</a> •
  <a href="/faq.html">FAQ</a>
</footer>
