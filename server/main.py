"""Web server to manage commits and pushes"""
from zipfile import ZipFile
from pathlib import Path
import shutil
import subprocess
import time
import json

from flask import Flask, abort

from server.diff import Diff

app = Flask(__name__)


@app.get("/unzip")
def unzip():  # type: ignore
    shutil.copyfile(
        "scratch-git-test/project.json", "scratch-git-test/project.old.json"
    )

    time.sleep(1)
    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("scratch-git-test")

    return {}


@app.get("/commit")
def commit():  # type: ignore
    """Commits the state of a Scratch project"""

    with open("scratch-git-test/project.old.json", encoding="utf-8") as fh:
        current_project = Diff(json.load(fh))

    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        new_project = Diff(json.load(fh))

    costume_removals = new_project.costumes(current_project)
    commit_message = ", ".join(current_project.commits(new_project))

    for _, (path, _) in costume_removals:
        Path(f"scratch-git-test/{path}").unlink(missing_ok=True)

    if subprocess.call(["git", "add", "."], cwd="./scratch-git-test") != 0:
        abort(500)

    with subprocess.Popen(
        ["git", "commit", "-m", commit_message],
        cwd="./scratch-git-test",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ) as commit_cmd:
        if commit_cmd != 0:
            _, stderr = commit_cmd.communicate()
            if ".git/hooks/commit-msg" not in stderr.decode("utf-8"):
                abort(500)

    return commit_message


@app.get("/push")
def push():  # type: ignore
    """Pushes to a remote Git repository"""

    if subprocess.call(["git", "push"], cwd="./scratch-git-test") != 0:
        abort(500)

    return {}


@app.get("/project.old.json")
def project_old():  # type: ignore
    """Retreive the project.old.json"""
    with open("scratch-git-test/project.old.json", encoding="utf-8") as fh:
        return json.load(fh)["targets"][0]["blocks"]


@app.get("/project.json")
def project():  # type: ignore
    """Retreive the current project.json"""
    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        return json.load(fh)["targets"][0]["blocks"]

@app.get("/sprites")
def sprites(): # type: ignore
    """Retreive sprites that have been changed since project changes"""
    with open("scratch-git-test/project.old.json", encoding="utf-8") as fh:
        current_project = Diff(json.load(fh))

    with open("scratch-git-test/project.json", encoding="utf-8") as fh:
        new_project = Diff(json.load(fh))
    
    return {"sprites": [commit.split(":")[0] for commit in current_project.commits(new_project)]}

def main() -> None:
    """Entrypoint for web server"""
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
