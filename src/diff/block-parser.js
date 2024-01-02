export default async function (oldProject, newProject, scriptNumber) {
    await import(
        "https://cdn.jsdelivr.net/npm/parse-sb3-blocks@0.5.0/dist/parse-sb3-blocks.browser.js"
    );

    const oldBlocks = parseSB3Blocks.toScratchblocks(
        Object.keys(oldProject).filter((key) =>
            oldProject[key].opcode.startsWith("event_when")
        )[scriptNumber],
        oldProject,
        "en",
        {
            tabs: "",
        }
    );

    const newBlocks = parseSB3Blocks.toScratchblocks(
        Object.keys(newProject).filter((key) =>
            newProject[key].opcode.startsWith("event_when")
        )[scriptNumber],
        newProject,
        "en",
        {
            tabs: "",
        }
    );

    return {
        oldBlocks,
        newBlocks,
    };
}