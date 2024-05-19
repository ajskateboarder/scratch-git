#!/bin/bash

<<<<<<< HEAD
if [[ ! -d node_modules ]]; then
    npm install
fi

cargo build
node_modules/rollup/dist/bin/rollup -c -w --debug &
=======
cargo build
node_modules/rollup/dist/bin/rollup -c
killall scratch-git;
killall turbowarp-desktop;
killall turbowarp;
>>>>>>> 4a0b5769348613dbad11c86faaf334b85317c0cb
/opt/TurboWarp/turbowarp-desktop >/dev/null &
target/debug/scratch-git --debug > log.txt