from operator import itemgetter
from itertools import groupby

from zipfile import ZipFile
from pathlib import Path
from io import StringIO
import subprocess
import time
import json

from flask import Flask, abort

from server.diff import Diff

app = Flask(__name__)


def sort_costumes(items):
    d = {}
    for row in items:
        if row[0] not in d:
            d[row[0]] = []
        d[row[0]].append(row[1])
    return d


@app.get("/commit")
def commit():
    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        current_project = Diff(json.load(fh))

    time.sleep(1)

    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("scratch-git-test")

    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        new_project = Diff(json.load(fh))

    commit = StringIO()

    costume_additions = current_project.costume_diff(new_project)
    costume_removals = new_project.costume_diff(current_project)

    commit.write(", ".join(current_project.block_diff(new_project)))

    temp_changes_ = ", ".join(
        [
            f"{sprite}: add {', '.join([c[1] for c in costume])}"
            for sprite, costume in sort_costumes(costume_additions).items()
        ]
    )
    commit.write(
        (", " if temp_changes_ and commit.getvalue() != "" else "") + temp_changes_
    )
    temp_changes_ = ", ".join(
        [
            f"{sprite}: remove {', '.join([c[1] for c in costume])}"
            for sprite, costume in sort_costumes(costume_removals).items()
        ]
    )
    commit.write(
        (", " if temp_changes_ and commit.getvalue() != "" else "") + temp_changes_
    )

    commit_message = commit.getvalue()
    commit.close()

    for _, (path, _) in costume_removals:
        Path(f"scratch-git-test/{path}").unlink(missing_ok=True)

    if subprocess.call(["git", "add", "."], cwd="./scratch-git-test") != 0:
        abort(500)

    if (
        subprocess.call(
            ["git", "commit", "-m", commit_message],
            cwd="./scratch-git-test",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        != 0
    ):
        abort(500)

    return {}


@app.get("/push")
def push():
    if subprocess.call(["git", "push"], cwd="./scratch-git-test") != 0:
        abort(500)

    return {}


def main() -> None:
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
