from __future__ import annotations

import shutil
import sys
from http.client import HTTPConnection
from os import system
from os.path import expandvars
from pathlib import Path
from platform import uname

from server.application import app


def tw_path() -> Path | None:
    platform = uname().system
    # no macos support because I don't own mac :-/
    if platform == "Windows":
        pth = Path(expandvars("%APPDATA%")) / "turbowarp-desktop"
        if list(pth.glob("*")):
            return pth
        pth = Path(expandvars("%LOCALAPPDATA%")) / "Packages"
        try:
            store_folder = next(
                f.name for f in pth.glob("*") if "TurboWarpDesktop" in f.name
            )
            cache_exists = list((pth / store_folder).glob("LocalCache"))
            if cache_exists:
                return (
                    pth / store_folder / "LocalCache" / "Roaming" / "turbowarp-desktop"
                )
        except StopIteration:
            pass
    if platform == "Linux":
        HOME = expandvars("$HOME")
        pth = Path(HOME) / ".config" / "turbowarp-desktop"
        if list(pth.glob("*")):
            return pth
        pth = (
            Path(HOME)
            / ".var"
            / "app"
            / "org.turbowarp.TurboWarp"
            / "config"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
        pth = (
            Path(HOME)
            / "snap"
            / "turbowarp-desktop"
            / "current"
            / ".config"
            / "turbowarp-desktop"
        )
        if list(pth.glob("*")):
            return pth
    return None


def main() -> None:
    path: Path | str | None = tw_path()

    debug = False
    if len(sys.argv) > 1:
        if sys.argv[1] == "--debug":
            debug = True

    if path is None:
        print(
            "Failed to find TurboWarp path automatically. Please paste the correct path from the following: \n\thttps://github.com/TurboWarp/desktop#advanced-customizations"
        )
        path = expandvars(input(": "))
        sys.exit(1)

    if debug:
        system("rollup -c")
        userscript = Path("userscript.js")
        userscript.write_text(
            Path("src/reloader.js").read_text("utf-8")
            + "\n"
            + userscript.read_text("utf-8"),
            "utf-8",
        )
        HTTPConnection("localhost", 3333).request(
            "GET", "/update", headers={"Host": "localhost"}
        )

    shutil.copy2("userscript.js", path)
    print("Script copied to", path)
    app.run(port=6969)


if __name__ == "__main__":
    main()
