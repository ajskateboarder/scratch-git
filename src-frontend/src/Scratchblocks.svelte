<script lang="ts">
    import scratchblocks from "scratchblocks/browser.es";
    import { onMount } from "svelte";

    export let style: string
    let id = Math.random().toString(36)

    onMount(() => {
        try {
            scratchblocks.renderMatching(`[id="${id}"]`, {
                style: "scratch3",
                languages: ["en"],
                scale: 0.675,
            });
        } catch(e) {
            alert(e)
        }
    });
</script>

<pre class="blocks" {style} {id}>
    <slot />
</pre>
