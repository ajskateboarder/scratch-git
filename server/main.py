from zipfile import ZipFile
import time
import os

from flask import Flask

app = Flask(__name__)

@app.get("/commit")
def update():
    time.sleep(1)
    with ZipFile("Project.sb3", "r") as fh:
        fh.extractall("project")

    return {}

if __name__ == "__main__":
    os.makedirs("project", exist_ok=True)
    app.run(port=6969)
