const process = require("process");
const { toScratchblocks } = require("./parse-sb3-blocks");

(async () => {
  try {
    const [key, json] = (await process.stdin.toArray())
      .toString()
      .trim()
      .split(/,(.*)/s);
    console.log(toScratchblocks(key, JSON.parse(json), "en", { tab: "  " }));
  } catch {
    process.exit(1);
  }
})();
