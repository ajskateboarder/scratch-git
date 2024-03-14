(async function () {
  try {
    scratchblocks;
    parseSB3Blocks;
  } catch {
    await import(
      "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
    );
    await import(
      "https://cdn.jsdelivr.net/npm/scratchblocks@latest/build/scratchblocks.min.js"
    );
  }
})();

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
