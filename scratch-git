#!/bin/bash

copy-script() {
    cp userscript.js ~/.config/turbowarp-desktop/userscript.js
    echo "Updated"
}

turbowarp() {
    /opt/TurboWarp/turbowarp-desktop $1 >/dev/null 2>&1
}

start-server() {
    if [ ! -d "$DIRECTORY" ]; then
        python3 -m venv server/env
        . server/env/bin/activate
        pip install -r server/requirements.txt
    fi
    python3 -m server.main
}

if [ "$0" = "$BASH_SOURCE" ]; then
    copy-script
    start-server &
    turbowarp Project.sb3
    kill `lsof -i :6969 | tail -n 1 | awk '{print $2}'` &>/dev/null
fi
