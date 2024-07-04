#!/bin/bash

if [[ ! -d node_modules ]]; then
    npm install
fi

watchexec --exts rs --restart -- cargo run -- --debug &
node_modules/rollup/dist/bin/rollup -c -w --debug &

# you can change this by finding the running binary in `ps -aux`
# /opt/TurboWarp/turbowarp-desktop >/dev/null
/snap/turbowarp-desktop/50/turbowarp-desktop >/dev/null