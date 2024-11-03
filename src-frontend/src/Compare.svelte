<script lang="ts">
    import { showingCompare, compareInfo } from "./compare";
    import Scratchblocks from "./Scratchblocks.svelte";

    let plainText = false;
</script>

<!-- 
i have NO SINGLE CLUE WHY I NEED THIS
but for some reason svelte won't put dialog bgs,
even when the dialog goes out of the body
-->
<div
    class="dialog-wrapper"
    style="display: {$showingCompare ? 'flex' : 'none'}"
>
    <dialog open={$showingCompare}>
        {#if $compareInfo === null}
            <p>
                Uh oh something went wrong on the server. Try again that might
                work
            </p>
        {/if}
        <div class="close-header">
            <h2>
                {#if $compareInfo}
                    {@const spriteCount = Object.entries($compareInfo.changes)
                        .map(([a, b]) => (b.length !== 0 ? a : undefined))
                        .filter((e) => e !== undefined).length}
                    {spriteCount > 0 ? spriteCount : "No"} sprite{spriteCount ===
                    1
                        ? ""
                        : "s"} changed
                {:else}
                    ...
                {/if}
            </h2>
            <button
                style="height: 30px"
                on:click={() => {
                    $showingCompare = false;
                    $compareInfo = undefined;
                }}><i class="fa-solid fa-xmark fa-xl"></i></button
            >
        </div>
        {#if $compareInfo}
            {#key plainText}
                <button on:click={() => (plainText = !plainText)}>
                    {#if plainText}
                        <i class="fa-solid fa-file"></i> see blocks
                    {:else}
                        <i class="fa-solid fa-code"></i> see text
                    {/if}
                </button>
            {/key}
            {#each Object.entries($compareInfo.changes).filter(([_, b]) => b.length !== 0) as [sprite, changes]}
                <details open>
                    <summary>
                        <span
                            style="display: inline-flex; width: 95%; align-items: center; justify-content: space-between"
                        >
                            <h3 style="display: inline-block">{sprite}</h3>
                            <span
                                ><b
                                    >+{changes
                                        .map((e) => e.diffed.added)
                                        .reduce((a, b) => a + b, 0)} -{changes
                                        .map((e) => e.diffed.removed)
                                        .reduce((a, b) => a + b, 0)}</b
                                > lines changed</span
                            >
                        </span>
                    </summary>
                    {#key plainText}
                        {#each changes as change}
                            {@const style =
                                "width: 100%; padding: 5px; overflow-x: auto"}
                            {#if plainText}
                                <pre {style}>{change.diffed.diffed}</pre>
                            {:else}
                                <Scratchblocks {style}
                                    >{change.diffed.diffed}</Scratchblocks
                                >
                            {/if}
                        {/each}
                    {/key}
                </details>
            {/each}
        {:else}
            <span style="display: flex; justify-content: center; width: 100%"
                ><svg
                    class="spinner"
                    width="65px"
                    height="65px"
                    viewBox="0 0 66 66"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <circle
                        class="path"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="6"
                        stroke-linecap="round"
                        cx="33"
                        cy="33"
                        r="30"
                    ></circle>
                </svg></span
            >
        {/if}
    </dialog>
</div>

<style scoped>
    .dialog-wrapper {
        position: fixed;
        width: 100vw;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(1px);
        left: 0;
        margin: 0;
        padding: 0;
        z-index: 998;
    }

    .close-header {
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    dialog {
        width: 40rem;
        height: 20rem;
        overflow-y: auto;
        z-index: 999;
        border: none;
    }

    @media (max-width: 760px) {
        dialog {
            width: 100%;
            height: 100%;
            margin: 0;
        }
    }

    summary h3 {
        display: inline-block;
    }

    details {
        border: 1px solid grey;
        border-top: none;
        border-radius: 5px;
    }

    summary {
        border-top: 1px solid grey;
        border-radius: 5px;
        padding: 5px;
        padding-top: 0px;
        padding-bottom: 0px;
    }

    summary:hover {
        background-color: #f1f1f1;
    }

    @media (prefers-color-scheme: dark) {
        summary:hover {
            background-color: #444;
        }
    }
</style>
