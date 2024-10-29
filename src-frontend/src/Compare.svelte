<script>
    import { showingCompare, compareInfo } from "./compare";
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
        <div class="close-header">
            <button on:click={() => {
                $showingCompare = false
                $compareInfo = undefined
            }}><i class="fa-solid fa-xmark"></i></button>
        </div>
        {#if $compareInfo}
            {#each Object.entries($compareInfo.changes) as [sprite, changes]}
                <h2>{sprite}</h2>
                <span>{JSON.stringify(changes)}</span>
            {/each}
        {:else}
            <span style="display: flex; justify-content: center; width: 20vw"
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

<style>
    .dialog-wrapper {
        position: fixed;
        width: 100vw;
        pointer-events: none;
        height: 100vh;
        display: flex;
        justify-content: center;
        align-items: center;
        background: rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(1px);
        z-index: 999;
        left: 0;
    }

    .close-header {
        width: 100%;
        display: flex;
        justify-content: right;
    }

    dialog {
        width: 40rem;
    }

    @media (max-device-width: 760px) {
        dialog {
            width: 100vw;
            height: 100vh;
            margin: 0;
            border: none;
        }
    }
</style>
