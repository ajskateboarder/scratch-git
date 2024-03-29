# Adapted from https://maxhalford.github.io/blog/flask-sse-no-deps/

import queue

from pathlib import Path
from platform import uname
import shutil
import os
from os.path import expandvars
from flask import Flask, Response, make_response, request


class MessageAnnouncer:
    def __init__(self):
        self.listeners = []

    def listen(self):
        q = queue.Queue(maxsize=5)
        self.listeners.append(q)
        return q

    def announce(self, msg):
        for i in reversed(range(len(self.listeners))):
            try:
                self.listeners[i].put_nowait(msg)
            except queue.Full:
                del self.listeners[i]


def cors_preflight():
    response = make_response()
    response.headers.add("Access-Control-Allow-Origin", "*")
    response.headers.add("Access-Control-Allow-Headers", "*")
    response.headers.add("Access-Control-Allow-Methods", "*")
    return response


def cors(response):
    response.headers.add("Access-Control-Allow-Origin", "*")
    return response


def tw_path() -> Path:
    platform = uname().system
    if platform == "Windows":
        pth = Path(expandvars("%APPDATA%")) / "turbowarp-desktop"
        if list(pth.glob("*")):
            return pth
        pth = Path(expandvars("%LOCALAPPDATA%")) / "Packages"
        try:
            store_folder = next(
                f.name for f in pth.glob("*") if "TurboWarpDesktop" in f.name
            )
            cache_exists = list((pth / store_folder).glob("LocalCache"))
            if cache_exists:
                return (
                    pth / store_folder / "LocalCache" / "Roaming" / "turbowarp-desktop"
                )
        except StopIteration:
            pass
    if platform == "Linux":
        HOME = expandvars("$HOME")
        pth = Path(HOME) / ".config" / "turbowarp-desktop"
        if list(pth.glob("*")):
            return pth
        pth = (
            Path(HOME)
            / ".var"
            / "app"
            / "org.turbowarp.TurboWarp"
            / "config"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
        pth = (
            Path(HOME)
            / "snap"
            / "turbowarp-desktop"
            / "current"
            / ".config"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
    if platform == "Darwin":
        HOME = expandvars("$HOME")
        pth = (
            Path(HOME)
            / "Library"
            / "Application Support"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
        pth = (
            Path(HOME)
            / "Library"
            / "Containers"
            / "org.turbowarp.desktop"
            / "Data"
            / "Library"
            / "Application Support"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
    return None


app = Flask(__name__)
announcer = MessageAnnouncer()


@app.route("/update")
def ping():
    if request.method == "OPTIONS":
        return cors_preflight()
    os.system("rollup -c")
    shutil.copy2("userscript.js", tw_path())
    print("Copying to", tw_path())
    announcer.announce(msg="data: update\n\n")
    return {}


@app.get("/listen")
def listen():
    if request.method == "OPTIONS":
        return cors_preflight()

    def stream():
        messages = announcer.listen()
        while True:
            msg = messages.get()
            yield msg

    return cors(Response(stream(), mimetype="text/event-stream"))


if __name__ == "__main__":
    os.system("rollup -c")
    print("Copying to", tw_path())
    shutil.copy2("userscript.js", tw_path())
    app.run(port=3333)