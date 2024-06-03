<script lang="ts">
  import logo from "/logo.svg";
  import lightDiff from "/light-diff.mp4";
  import darkDiff from "/dark-diff.mp4";
</script>

<main>
  <header>
    <h1>
      <img src={logo} alt="scratch.git logo" width="70" />
      <span style="font-size: 40px;">scratch.git</span>
    </h1>
    <h2>
      scratch.git provides a way to view/track your changes, revert to versions
      changes of projects, and collaborate more efficiently from TurboWarp
      Desktop.
    </h2>
  </header>
  <div style="display: flex; flex-wrap: wrap">
    <video autoplay loop muted>
      <source src={lightDiff} />
    </video>
    <video autoplay loop muted height="276">
      <source src={darkDiff} />
    </video>
  </div>
  <footer>
    <br />
    scratch.git is not affiliated with Scratch, the Scratch Team, or the Scratch
    Foundation.
    <br />
    <a href="https://github.com/ajskateboarder/scratch-git" target="_blank">
      <i class="fas sack" /></a
    >
  </footer>
</main>
