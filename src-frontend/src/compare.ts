import { writable, type Writable } from "svelte/store"
import type { Commit } from "./lib/index"

export let showingCompare = writable(false)
export let compareInfo: Writable<Record<string, Commit[]> | undefined> = writable(undefined)