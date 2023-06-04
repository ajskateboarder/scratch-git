# scratch-git

Git integration for Scratch (TurboWarp) that just works

⚠️ **This is a dumb side project, please don't use this seriously.**

Some people are looking for an integrated version control system for Scratch, so this a first step toward that.

## Usage

Install these things:
- [TurboWarp Desktop](https://desktop.turbowarp.org/) 
- [Git](https://git-scm.com) (in case you didn't read the title)
- [Python](https://python.org/downloads)

Then run the following in the cloned repo:

```bash
./scratch-git
```

This opens `Project.sb3` in the TurboWarp editor and launches the web server to manage commits/pushes. It also copies the userscript to the config folder for TurboWarp to inject stuff.

You should now see a new button labeled "Push changes" which runs pushes code from the backend. The save button in the top-right should also be able to generate commits based on changes that you make to your project.

Congrats, you are now a 🦄✨~ _**1000x** developer_ ~✨🦄, no terminal skills required
