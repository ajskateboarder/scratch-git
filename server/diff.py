"""Helper class to manage asset/code differences"""
from __future__ import annotations


class Diff:
    """Helper methods for project.json"""

    def __init__(self, data: dict) -> None:
        self.data = data

    @staticmethod
    def get_costume_path(costume: dict) -> str:
        """Attempt to return the MD5 extension of a costume"""
        return costume.get("md5ext") or f"{costume['assetId']}.{costume['dataFormat']}"

    def num_blocks(self) -> dict[str, int]:
        """Return the current number of blocks per sprite"""
        return {
            sprite["name"]: len(sprite["blocks"].values())
            for sprite in self.data["targets"]
        }

    def costumes(self) -> dict[str, list[tuple[str, str]]]:
        """Return the path to every costume being used"""
        return {
            sprite["name"]: [
                (self.get_costume_path(costume), costume["name"])
                for costume in sprite["costumes"]
            ]
            for sprite in self.data["targets"]
        }

    def block_diff(self, new: Diff) -> list[str]:
        """Return the block number difference between each sprite in two projects.

        `new` param is the Diff object which contains newer changes"""
        commits = []
        for old_blocks, (sprite, new_blocks) in zip(
            self.num_blocks().values(), new.num_blocks().items()
        ):
            diff = new_blocks - old_blocks
            if diff != 0:
                if sprite == "Stage":
                    diff = diff // 2
                commits.append(f"{sprite}: {'+' if diff > 0 else ''}{diff} blocks")
        return commits

    def costume_diff(self, new: Diff) -> list[tuple[str, tuple[str, str]]]:
        """Return the costume differences between each sprite in two projects."""
        new_costumes = [
            (sprite, costume)
            for sprite, new_item in new.costumes().items()
            for costume in new_item
        ]
        old_costumes = [
            (sprite, costume)
            for sprite, new_item in self.costumes().items()
            for costume in new_item
        ]
        added = set(new_costumes) - set(old_costumes)
        return list(added)
