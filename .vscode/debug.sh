#!/bin/bash

if [[ ! -d node_modules ]]; then
    npm install
fi

cargo build
node_modules/rollup/dist/bin/rollup -c -w --debug &
/opt/TurboWarp/turbowarp-desktop >/dev/null &
target/debug/scratch-git --debug > log.txt