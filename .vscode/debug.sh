#!/bin/sh

set -e

killall turbowarp-desktop || true
killall scratch-git || true
cargo build
node_modules/rollup/dist/bin/rollup -c
target/debug/scratch-git --debug &
/opt/TurboWarp/turbowarp-desktop >/dev/null