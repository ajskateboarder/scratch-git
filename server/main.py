"""Web server to manage commits and pushes"""
from zipfile import ZipFile
from pathlib import Path
from os.path import basename
import shutil
import subprocess
import time
import json

from flask import Flask, abort, request
from flask_cors import CORS

from server.diff import DiffGen

app = Flask(__name__)
CORS(app)


class ProjectConfig:
    def __init__(self, file_name: str) -> None:
        self.file_name = file_name
        if Path(file_name).exists():
            with open(Path(file_name), encoding="utf-8") as fh:
                self.map = json.load(fh)
        else:
            Path(file_name).write_text("{}")
            self.map = {}

    def save(self) -> None:
        Path(self.file_name).write_text(json.dumps(self.map))


config = ProjectConfig("project_config.json")


def extract_project(project_name: str) -> None:
    project = config.map[project_name]

    with ZipFile(project["project_file"], "r") as fh:
        fh.extractall(project["base"])


@app.get("/create_project")
def create_project():  # type: ignore
    file_name = request.args.get("file_name")
    if file_name is None:
        abort(500)
    name = basename(Path(file_name)).split(".")[0]

    project_path = Path(name).absolute()
    file_path = Path(file_name).absolute()

    if not config.map.get(name):
        config.map[name] = {
            "base": str(project_path),
            "project_file": str(file_path),
        }
    else:
        i = 0
        if Path(f"{name}~0").exists():
            while Path(f"{name}~{i}").exists():
                i += 1
        name = f"{name}~{i}"
        config.map[name] = {
            "base": str(Path(name).absolute()),
            "project_file": str(file_path),
        }

    config.save()
    Path(name).mkdir()
    extract_project(name)

    return {"project_name": name}


@app.get("/<project_name>/unzip")
def unzip(project_name):  # type: ignore
    project = config.map[project_name]
    project_dir = Path(project["base"])

    try:
        shutil.copyfile(project_dir / "project.json", project_dir / "project.old.json")
    except FileNotFoundError:
        pass

    time.sleep(1)
    with ZipFile(project["project_file"], "r") as fh:
        fh.extractall(project_dir)

    return {}


@app.get("/<project_name>/commit")
def commit(project_name):  # type: ignore
    """Commits the state of a Scratch project"""
    project_dir = Path(config.map[project_name]["base"])

    with open(project_dir / "project.old.json", encoding="utf-8") as fh:
        current_project = DiffGen(json.load(fh))

    with open(project_dir / "project.json", encoding="utf-8") as fh:
        new_project = DiffGen(json.load(fh))

    costume_removals = new_project.costumes(current_project)
    commit_message = ", ".join(current_project.commits(new_project))

    for _, (path, _) in costume_removals:
        Path(project_dir / path).unlink(missing_ok=True)

    if subprocess.call(["git", "add", "."], cwd=project_dir) != 0:
        abort(500)

    with subprocess.Popen(
        ["git", "commit", "-m", commit_message],
        cwd=project_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ) as commit_cmd:
        if commit_cmd != 0:
            _, stderr = commit_cmd.communicate()
            # TODO: modify below code, why do I depend on a commit hook?
            if ".git/hooks/commit-msg" not in stderr.decode("utf-8"):
                abort(500)

    return commit_message


@app.get("/<project_name>/push")
def push(project_name):  # type: ignore
    """Pushes to a remote Git repository"""
    project_dir = Path(config.map[project_name]["base"])

    if subprocess.call(["git", "push"], cwd=project_dir) != 0:
        abort(500)

    return {}


@app.get("/<project_name>/project.old.json")
def old_project(project_name):  # type: ignore
    """Retreive the project.old.json"""
    project_dir = Path(config.map[project_name]["base"])

    with open(project_dir / "project.old.json", encoding="utf-8") as fh:
        project = json.load(fh)
        return [
            e["blocks"]
            for e in project["targets"]
            if e["name"] == request.args.get("name")
        ][0]


@app.get("/<project_name>/project.old.json")
def current_project(project_name):  # type: ignore
    """Retreive the current project.json"""
    project_dir = Path(config.map[project_name]["base"])

    with open(project_dir / "project.json", encoding="utf-8") as fh:
        project = json.load(fh)
        return [
            e["blocks"]
            for e in project["targets"]
            if e["name"] == request.args.get("name")
        ][0]


@app.get("/<project_name>/commits")
def commits(project_name):  # type: ignore
    """Retrieve commits"""
    project_dir = Path(config.map[project_name]["base"])

    with subprocess.Popen(
        [
            "git",
            "log",
            "--pretty=format:"
            + '{%n  "commit": "%H",%n  "subject": "%s",%n  "body": "%b",%n  "author": {%n    "name": "%aN",%n    "email": "%aE",%n    "date": "%aD"%n  }%n}',
        ],
        cwd=project_dir,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    ) as commit_cmd:
        output, _ = commit_cmd.communicate()
        output = json.loads(
            "[" + output.decode().replace("  }\n}", "  }\n},")[:-1] + "]", strict=False
        )

    return output


@app.get("/<project_name>/sprites")
def sprites(project_name):  # type: ignore
    """Retreive sprites that have been changed since project changes"""
    project_dir = Path(config.map[project_name]["base"])

    with open(project_dir / "project.old.json", encoding="utf-8") as fh:
        current_project = DiffGen(json.load(fh))

    with open(project_dir / "project.json", encoding="utf-8") as fh:
        new_project = DiffGen(json.load(fh))

    return {
        "sprites": [
            commit.split(":")[0] for commit in current_project.commits(new_project)
        ]
    }


if __name__ == "__main__":
    app.run(port=6969, debug=True, use_reloader=True)
