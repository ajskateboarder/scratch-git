#!/bin/bash

if [[ ! -d node_modules ]]; then
    npm install
fi

watchexec --exts rs --restart -- cargo run -- --debug &
node_modules/rollup/dist/bin/rollup -c -w --debug &
/snap/turbowarp-desktop/50/turbowarp-desktop >/dev/null
# target/debug/scratch-git --debug > log.txt