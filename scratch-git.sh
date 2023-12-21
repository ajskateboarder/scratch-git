#!/bin/bash

turbowarp() {
    echo $1
    /opt/TurboWarp/turbowarp-desktop $1 >/dev/null 2>&1
}

start-server() {
    python3 scratch-git.py $1
}

if [ "$0" = "$BASH_SOURCE" ]; then
    start-server Project.sb3 &
    turbowarp Project.sb3
    kill `lsof -i :6969 | tail -n 1 | awk '{print $2}'` &>/dev/null
fi
