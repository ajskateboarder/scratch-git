// @ts-ignore
import { scratchblocks as scratchblocks_ } from "./scratchblocks.js";
// @ts-ignore
import { parseSB3Blocks as parseSB3Blocks_ } from "./parse-sb3-blocks.js";

type ScratchBlocks = {
  appendStyles: () => void;
  renderMatching: (loc: string, config: {}) => void;
};

type toScratchblocks = (
  script: string,
  json: {},
  language: string,
  config: {}
) => string;

export const scratchblocks: ScratchBlocks = scratchblocks_;
export const toScratchblocks: toScratchblocks = parseSB3Blocks_.toScratchblocks;
export * from "./globals";
