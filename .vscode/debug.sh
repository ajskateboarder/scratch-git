#!/bin/bash

cargo build
node_modules/rollup/dist/bin/rollup -c
killall scratch-git;
killall turbowarp-desktop;
killall turbowarp;
/opt/TurboWarp/turbowarp-desktop >/dev/null &
target/debug/scratch-git --debug > log.txt