from server.diff import Diff
import json

with open("scratch-git-test/project_w.json") as fh:
    project_w = Diff(json.load(fh))

with open("scratch-git-test/project.json") as fh:
    project = Diff(json.load(fh))

print(project_w.block_diff(project))
print(project_w.costume_diff(project))
print(project.costume_diff(project_w))
