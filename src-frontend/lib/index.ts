import { parseSB3Blocks as parseSB3Blocks_ } from "./parse-sb3-blocks.js";
import { scratchblocks as scratchblocks_ } from "./scratchblocks.js";

type ScratchBlocks = {
  appendStyles: () => void;
  renderMatching: (loc: string, config: Record<string, any>) => void;
};

type toScratchblocks = (
  script: string,
  json: Record<string, any>,
  language: string,
  config: Record<string, any>,
) => string;

export const scratchblocks: ScratchBlocks = scratchblocks_;
export const toScratchblocks: toScratchblocks = parseSB3Blocks_.toScratchblocks;
export * from "./globals";
