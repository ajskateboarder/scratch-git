# scratch-git

Git version control integration for Scratch (TurboWarp) that just works

https://github.com/ajskateboarder/scratch-git/assets/81255936/4374d0a8-1d89-4aad-a968-5919a63b6b27

Some people are looking for better collaboration - not needing to form remix chains - and versioning with Scratch, so this a first step toward that. This integration is very work-in-progress, so expect bugs and significant changes. Building this will likely not work as-is.

## Usage

1) Install these things:

- [TurboWarp Desktop](https://desktop.turbowarp.org/)
- [Git](https://git-scm.com) (in case you didn't read the title)

(For development, you'll need a recent version of [Node.js](https://nodejs.org) to compile the userscript, [Rust](https://rustup.rs/) to compile the server, and [Python](https://python.org) to setup live debugging)

2) Download the scratch-git release for your system from the [Releases section](https://github.com/ajskateboarder/scratch-git/releases)

3) Unpack the zip or tar.gz and run the scratch-git executable - it'll run continuously until you close out the terminal or do Ctrl+C

You should now see a new button labeled "Push changes" which runs pushes code from the backend. The save button in the top-right should also be able to make commits based on changes that you make to your project, with a diff-like view for sprite code.

Congrats, you are now a 🦄✨~ _**1000x** developer_ ~✨🦄, no Git skills required!!

## Developing

Install the build dependencies:

```bash
npm install -g rollup nodemon
npm install rollup-plugin-string
```

And run the following to reload the frontend and backend whenever changes are saved:

```bash
python3 debug.py &
nodemon -x "cargo run -- --debug" -w src
```

Alternatively, if you are using VSCode, there is a build task you can configure to run with <kbd>Ctrl+Shift+B</kbd>.

## Commit specification

scratch-git uses a derivative of [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/) which has been adapted to fit Scratch programming.

Changes are done by sprite and are separated by commas.

Commits start with the name of the sprite you are making changes to (e.g. Sprite1, Stage) with a comma afterwards (similar to CC).

Commits then specify the change they are making using one of the following statements:

| Statement                  | Description                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------ |
| `add [costumes]`           | The following costumes: `[costumes]` have been added                                 |
| `remove [costumes]`        | The following costumes: `[costumes]` have been removed                               |
| `modify [costumes]`        | The following costumes: `[costumes]` have been edited                                |
| `{+\|-\|/}{blocks} blocks` | `{blocks}` number of blocks have been added (`+`), removed (`-`), or rewritten (`/`) |

### Commit examples

```text
Sprite1: +3 blocks, add costume1, Stage: remove backdrop3
```

```text
Ball: /12 blocks, add red-ball, Stage: add matrix
```

```text
Player: +36 blocks, remove old-player, Cloud: +15 blocks
```

## Credits

Thanks to:

- @apple502j for the [parse-sb3-blocks](https://github.com/apple502j/parse-sb3-blocks) library

- @tjvr for the [scratchblocks](https://github.com/scratchblocks/scratchblocks) library

- @rokcoder-scratch for the inspiration, [sb3-commit](https://github.com/rokcoder-scratch/sb3-commit)

- @GarboMuffin for making TurboWarp easily extensible
