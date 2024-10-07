# scratch.git http backend

This is intended to offload some of the work that scratch.git typically does, like code diffing and commit viewing, to a remote server so it can be used from a website

Yes, I have nothing better to do

## Running

- Create a new GitHub OAuth app and have it redirect to `http://localhost:8080/github_auth`. This is to view commits from GitHub repos

- Get the client ID and a secret and export them to `GH_CLIENT_ID` and `GH_CLIENT_SECRET`

- Run `cargo run` from `src-server` 

- In another shell, run `npm run build` and start an HTTP server for the frontend

Sooner or later I'll make the sites configurable (i love my homelab sry :3)
