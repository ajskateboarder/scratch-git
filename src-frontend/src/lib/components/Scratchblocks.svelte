<script lang="ts">
    import scratchblocks from "scratchblocks/browser.es";
    import { onMount } from "svelte";

    export let style: string;
    let id = Math.random().toString(36);

    onMount(() => {
        scratchblocks.renderMatching(`[id="${id}"]`, {
            style: "scratch3",
            languages: ["en"],
            scale: 0.675,
        });
        const svg = document.querySelectorAll(`[id="${id}"] svg > g`);
        for (const blocks of svg) {
            for (const diff of blocks.querySelectorAll("path.sb3-diff")) {
                const moddedBlock = diff.previousElementSibling!.cloneNode(
                    true,
                ) as SVGElement;
                const fillColor = diff.classList.contains("sb3-diff-ins")
                    ? "green"
                    : diff.classList.contains("sb3-diff-del")
                      ? "red"
                      : "grey";
                moddedBlock
                    .querySelectorAll<
                        SVGPathElement | SVGGElement | SVGRectElement
                    >("path,g,rect") // g selector isn't needed maybe but just in case..
                    .forEach((element) => {
                        element.style.cssText = `fill: ${fillColor}; opacity: 0.5`;
                    });
                diff.previousElementSibling!.after(moddedBlock);
                diff.remove();
            };
        };
    });
</script>

<pre class="blocks" {style} {id}>
    <slot />
</pre>
