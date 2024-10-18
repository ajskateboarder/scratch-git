# scratch.git http backend

This is intended to offload some of the work that scratch.git typically does, like code diffing and commit viewing, to a remote server so it can be used from a website

Yes, I have nothing better to do

## Running

- Create a new GitHub OAuth app and have it redirect to your site's domain (`localhost` works for dev) followed by `/github_auth`. This is to view commits from GitHub repos

- Get the client ID and a secret and export them to `GH_CLIENT_ID` and `GH_CLIENT_SECRET`

- Export the site domain for your cookie to `COOKIE_LOC` (localhost works)

- Run `cargo run` from `src-server` 

- In another shell, export your client ID and server URL to `VITE_GH_CLIENT_ID` and `VITE_API_URL`

- Run `npm run whatever`