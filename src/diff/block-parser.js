export default async function (oldProject, newProject, scriptNumber) {
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