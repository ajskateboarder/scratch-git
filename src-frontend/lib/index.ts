import { parseSB3Blocks as parseSB3Blocks_ } from "./parse-sb3-blocks.js";
import { scratchblocks as scratchblocks_ } from "./scratchblocks.js";

export const scratchblocks: {
  appendStyles: () => void;
  renderMatching: (loc: string, config: Record<string, any>) => void;
} = scratchblocks_;

export const toScratchblocks: (
  script: string,
  json: Record<string, any>,
  language: string,
  config: Record<string, any>
) => string = parseSB3Blocks_.toScratchblocks;

export * from "./globals.js";
