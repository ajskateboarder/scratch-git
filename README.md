# scratch-git

Git integration for Scratch (TurboWarp) that just works

https://github.com/lemystic/scratch-git/assets/81255936/1285407f-c9dd-47ca-9a4d-95fd362c5844

⚠️ **This is a dumb side project, please don't use this seriously.**

Some people are looking for an integrated version control system for Scratch, so this a first step toward that.

## Usage

Install these things:

- [TurboWarp Desktop](https://desktop.turbowarp.org/)
- [Git](https://git-scm.com) (in case you didn't read the title)
- [Python](https://python.org/downloads)

After you clone the repo, clone a repo to use for project versioning, rename it to `scratch-git-test`:

```bash
git clone link_to_repo
mv name_of_repo scratch-git-test
```

Then download a Scratch project locally and rename it to `Project.sb3`. Finally, run this:

```bash
./scratch-git
```

This opens `Project.sb3` in the TurboWarp editor and launches the web server to manage commits/pushes. It also copies the userscript to the config folder for TurboWarp to inject stuff.

You should now see a new button labeled "Push changes" which runs pushes code from the backend. The save button in the top-right should also be able to generate commits based on changes that you make to your project.

Congrats, you are now a 🦄✨~ _**1000x** developer_ ~✨🦄, no terminal skills required
