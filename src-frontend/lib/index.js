import parseSB3Blocks from "./parse-sb3-blocks";
import "./scratchblocks";

export const Scratchblocks = {
  /** @returns {void} */
  appendStyles() {
    scratchblocks.appendStyles();
  },
  /**
   * @param {string} selector
   * @param {{ style: string, scale: number }} options
   * @returns {void}
   */
  renderMatching(selector, options) {
    scratchblocks.renderMatching(selector, options);
  },
};

export const ParseSB3Blocks = {
  /**
   * @param {string} scriptIndex
   * @param {object} project
   * @param {string} language - en by default
   * @param {{ tabs: string }} options
   * @returns {string}
   */
  toScratchblocks(scriptIndex, project, language = "en", options) {
    return parseSB3Blocks.toScratchblocks(
      scriptIndex,
      project,
      language,
      options
    );
  },
};
