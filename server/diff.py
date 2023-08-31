"""Manages asset/code differences"""
from __future__ import annotations
from typing import Iterable, Any, no_type_check


class Diff:
    """Commit generation methods for Scratch project assets and code"""

    def __init__(self, data: dict) -> None:
        self.data = data

    @staticmethod
    def get_costume_path(costume: dict) -> str:
        """Attempt to return the MD5 extension of a costume item (project.json)"""
        return costume.get("md5ext") or f"{costume['assetId']}.{costume['dataFormat']}"

    @staticmethod
    def group_items(items: Iterable[Any]) -> dict[str, list]:
        """Group items from an iterable into a dictionary"""
        groups: dict[str, list] = {}
        for row in items:
            if row[0] not in groups:
                groups[row[0]] = []
            groups[row[0]].append(row[1])
        return groups

    def _blocks(self) -> dict[str, int]:
        """Return the current number of blocks per sprite"""
        return {
            sprite["name"]: len(sprite["blocks"].values())
            for sprite in self.data["targets"]
        }

    def _costumes(self) -> dict[str, list[tuple[str, str]]]:
        """Return the path to every costume being used"""
        return {
            sprite["name"]: [
                (self.get_costume_path(costume), costume["name"])
                for costume in sprite["costumes"]
            ]
            for sprite in self.data["targets"]
        }

    def blocks(self, new: Diff) -> list[str]:
        """Return the block number difference between each sprite in two projects.

        `new` param is the Diff object which contains newer changes"""
        commits = []
        for old_blocks, (sprite, new_blocks) in zip(
            self._blocks().values(), new._blocks().items()
        ):
            diff = new_blocks - old_blocks
            if diff != 0:
                commits.append(f"{sprite}: {'+' if diff > 0 else ''}{diff} blocks")
        return commits

    def costumes(self, new: Diff) -> list[tuple[str, tuple[str, str]]]:
        """Return the costume differences between each sprite in two projects.

        `new` param is the Diff object which contains newer changes"""
        new_costumes = [
            (sprite, costume)
            for sprite, new_item in new._costumes().items()
            for costume in new_item
        ]
        old_costumes = [
            (sprite, costume)
            for sprite, new_item in self._costumes().items()
            for costume in new_item
        ]

        # Retain the order of the set difference
        added = set(new_costumes) - set(old_costumes)
        return list(filter(added.__contains__, new_costumes))

    def _merged_costumes(self, new: Diff) -> Any:
        """Return costumes that have changed between projects, but not added or removed"""

        # This code is SOOO bad
        @no_type_check
        def _modify_merge(costume_map):
            for i, _ in enumerate(merged.copy()):
                merged[i] = list(merged[i])
                merged[i][1] = list(merged[i][1])
                merged[i][1][0] = costume_map[merged[i][1][1]]
                merged[i][1] = tuple(merged[i][1])
                merged[i] = tuple(merged[i])

        added = self.costumes(new)
        removed = new.costumes(self)

        added_no_path = []
        costume_map_add = {}

        for sprite, (path, name) in added.copy():
            costume_map_add[name] = path
            added_no_path.append((sprite, (None, name)))

        removed_no_path = []
        costume_map_rm = {}

        for sprite, (path, name) in removed.copy():
            costume_map_rm[name] = path
            removed_no_path.append((sprite, (None, name)))

        merged = list(set(added_no_path).intersection(removed_no_path))
        _modify_merge(costume_map_add)

        for item in merged:
            added.remove(item)  # type: ignore

        _modify_merge(costume_map_rm)
        for item in merged:
            removed.remove(item)  # type: ignore

        return added, removed, merged

    def format_costume_changes(self, changes: tuple, action: str) -> list[str]:
        """Group and format a set of costume changes into proper commits"""
        changes_ = [(m[0], f"{action} {m[1][1]}") for m in changes]
        _commits = {
            sprite: f"{act[0][0]} {', '.join(act[0][1])}"
            for sprite, actions in self.group_items(changes_).items()
            if (act := list(self.group_items([a.split(" ") for a in actions]).items()))
        }
        return list(_commits.items())  # type: ignore

    def commits(self, new: Diff) -> list[str]:
        """Create commits for changes from the current project to a newer one"""
        added_, removed_, merged_ = self._merged_costumes(new)

        blocks = [s.split(": ") for s in self.blocks(new)]
        added = self.format_costume_changes(added_, "add")
        merged = self.format_costume_changes(merged_, "modify")
        removed = self.format_costume_changes(removed_, "remove")

        commits_ = [*blocks, *added, *merged, *removed]
        return [
            f"{sprite}: {', '.join(changes)}"
            for sprite, changes in self.group_items(commits_).items()
        ]
