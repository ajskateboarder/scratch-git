from zipfile import ZipFile
from pathlib import Path
from filecmp import dircmp
import time

from flask import Flask

app = Flask(__name__)

@app.get("/commit")
def update():
    time.sleep(1)
    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("project/tomerge")

    diff = dircmp("project/current", "project/tomerge")
    for name in diff.diff_files:
        print(name)

    return {}

def main():
    merge_dir = Path("project/tomerge")
    current_dir = Path("project/current")

    merge_dir.mkdir(parents=True, exist_ok=True)
    current_dir.mkdir(exist_ok=True)

    content = [f for f in Path("project/current").glob("*") if f.is_file()]

    if not content:
        with ZipFile("Project.sb3", "r") as fh:
            fh.extractall("project/current")

    app.run(port=6969, debug=True)

if __name__ == "__main__":
    main()
