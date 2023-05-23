#!/bin/bash

function copy-script {
    cp userscript.js ~/.config/turbowarp-desktop/userscript.js
    echo "Updated"
}

function turbowarp {
    /opt/TurboWarp/turbowarp-desktop $1 >/dev/null 2>&1
}

function start-server {
    if [[ ! -d "$DIRECTORY" ]] then
        python3 -m venv server/env
        . server/env/bin/activate
        pip install -r server/requirements.txt
    fi
    python3 server/main.py
}
