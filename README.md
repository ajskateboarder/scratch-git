# scratch.git http backend

This is intended to offload some of the work that scratch.git typically does, like code diffing and commit viewing, to a remote server so it can be used from a website

Yes, I have nothing better to do

## Running

- Install Node and Rust

- Create a new GitHub OAuth app and have it redirect to your site's domain (`localhost` works for dev) followed by `/github_auth`. This is to view commits from GitHub repos

    - Get the client ID and a secret and export them to `GH_CLIENT_ID` and `GH_CLIENT_SECRET`

- Export the site domain for your cookie to `COOKIE_LOC` (localhost works)

- Run `cargo run` from `src-server` 

- In another shell, export your client ID and server URL to `VITE_GH_CLIENT_ID` and `VITE_API_URL`

- Run `npm run dev` or `npm run build` and host the build directory

Here's a (probably good for production) nginx config

```nginx
server {
    listen 8000;
    server_name your-domain.here;
    root /path/to/scratch-git/src-frontend/dist;
    index index.html;
    location /api {
        rewrite ^/api/(.*)$ /$1 break;  
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
