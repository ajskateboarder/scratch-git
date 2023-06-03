from zipfile import ZipFile
from pathlib import Path
import subprocess
import time
import json

from flask import Flask, abort

from server.diff import Diff

app = Flask(__name__)


@app.get("/commit")
def update():
    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        current_project = Diff(json.load(fh))

    time.sleep(1)

    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("scratch-git-test")

    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        new_project = Diff(json.load(fh))

    print(current_project.block_diff(new_project))
    print(added := current_project.costume_diff(new_project))
    print(removed := new_project.costume_diff(current_project))

    if subprocess.call(["git", "add", "."], cwd="./scratch-git-test") != 0:
        abort(500)

    return {}

    if (
        subprocess.call(
            ["git", "commit", "-m", "'random stuff'"],
            cwd="./scratch-git-test",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        != 0
    ):
        abort(500)

    git_diff = subprocess.run(
        ["git", "diff", "--stat", "HEAD^", "HEAD"],
        capture_output=True,
        check=True,
        cwd="./scratch-git-test",
    )
    grep = subprocess.run(
        ["grep", "-v", "^ ./"],
        input=git_diff.stdout,
        capture_output=True,
        cwd="./scratch-git-test",
    )
    print(grep.stdout.decode().strip().split("\n")[:-1])

    return {}


def main():
    content = [
        f
        for f in Path("scratch-git-test").glob("*")
        if f.is_file() and not "LICENSE" in f.name
    ]

    if not content:
        with ZipFile("Project.sb3", "r") as fh:
            fh.extractall("scratch-git-test")

    app.run(port=6969, debug=True)


if __name__ == "__main__":
    main()
