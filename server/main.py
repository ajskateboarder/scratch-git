from zipfile import ZipFile
from pathlib import Path
import subprocess
import time

from flask import Flask, abort

app = Flask(__name__)

@app.get("/commit")
def update():
    time.sleep(1)
    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("scratch-git-test")

    if subprocess.call(["git", "add", "."]) != 0:
        abort(500)
    
    if subprocess.call(["git", "commit", "-m", "'random stuff'"]) != 0:
        abort(500)
    
    git_diff = subprocess.run(["git", "diff", "--stat", "HEAD^", "HEAD"], capture_output=True, check=True)
    grep_top = subprocess.run(["grep", "'^ ./'"], input=git_diff.stdout, capture_output=True)
    grep_git_objs = subprocess.run(["grep", "-v", "'^ ./.git'"], input=grep_top.stdout, capture_output=True)
    print(grep_git_objs.stdout.decode().strip())

    return {}

def main():
    content = [f for f in Path("scratch-git-test").glob("*") if f.is_file()]

    if not content:
        with ZipFile("Project.sb3", "r") as fh:
            fh.extractall("scratch-git-test")

    app.run(port=6969, debug=True)

if __name__ == "__main__":
    main()
