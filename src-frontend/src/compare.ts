import { writable, type Writable } from "svelte/store"

export let showingCompare = writable(false)
export let compareInfo: Writable<Record<string, any[][]> | undefined> = writable(undefined)