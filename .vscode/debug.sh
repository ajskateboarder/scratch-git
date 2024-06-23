#!/bin/bash

if [[ ! -d node_modules ]]; then
    npm install
fi

watchexec --exts rs --restart -- cargo run -- --debug &
node_modules/rollup/dist/bin/rollup -c -w --debug &
/opt/TurboWarp/turbowarp-desktop >/dev/null
# target/debug/scratch-git --debug > log.txt