<script lang="ts">
  export let url: string;
</script>

<main>
  {#if url !== ""}
    cool
  {/if}
  <input
    type="text"
    class="project-input"
    placeholder="https://somerepo.com/user/repository"
  />
  {url}
</main>
