# scratch-git

Git version control integration for Scratch (TurboWarp) that just works

https://github.com/ajskateboarder/scratch-git/assets/81255936/1285407f-c9dd-47ca-9a4d-95fd362c5844

(out of date as of now)

Some people are looking for better collaboration - not needing to form remix chains - and versioning with Scratch, so this a first step toward that. 

## Usage

Install these things:

- [TurboWarp Desktop](https://desktop.turbowarp.org/)
- [Git](https://git-scm.com) (in case you didn't read the title)
- [Python](https://python.org/downloads)

For development, you'll need a [recent version of Node](https://nodejs.org).

After you clone the repo, run the following to copy the userscript and run the server app:

```bash
pip install -r server/requirements.txt
python scratch-git.py
```

You should now see a new button labeled "Push changes" which runs pushes code from the backend. The save button in the top-right should also be able to make commits based on changes that you make to your project, with a diff-like view for sprite code.

Congrats, you are now a 🦄✨~ _**1000x** developer_ ~✨🦄, no Git skills required!!

## Developing

Run the following for some funny live-reload magic:

```bash
npm install -g rollup nodemon
python3 server/reloader.py &
nodemon -x "py scratch-git.py --debug" -w src -w server
```

## Commit specification

scratch-git uses a derivative of [Convential Commits](https://www.conventionalcommits.org/en/v1.0.0/) which has been adapted to fit Scratch programming.

Changes are done by sprite and are separated by commas.

Commits start with the name of the sprite you are making changes to (e.g. Sprite1, Stage) with a comma afterwards (similar to CC).

Commits then specify the change they are making using one of the following statements:

| Statement            | Description                                             |
| -------------        | -------------                                           |
| `add [costumes]`     | The following costumes: `[costumes]` have been added    |
| `remove [costumes]`  | The following costumes: `[costumes]` have been removed  |
| `modify [costumes]`  | The following costumes: `[costumes]` have been edited   |

| Statement     | Description   |
| ------------- | ------------- |
| `{+\|-\|/}{blocks} blocks`    |  `{blocks}` number of blocks have been added (`+`), removed (`-`), or rewritten (`/`)  |

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
