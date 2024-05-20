import { getBlockly } from "@/lib";

// https://github.com/TurboWarp/scratch-gui/blob/develop/src/addons/addons/find-bar/blockly/Utils.js

export function scrollBlockIntoView(blockOrId: string) {
  let workspace = getBlockly();
  let offsetX = 32;
  let offsetY = 32;
  let block = workspace.getBlockById(blockOrId);

  let root = block.getRootBlock();
  let base = block;
  while (base.getOutputShape() && base.getSurroundParent()) {
    base = base.getSurroundParent();
  }
  let ePos = base.getRelativeToSurfaceXY(),
    rPos = root.getRelativeToSurfaceXY(),
    scale = workspace.scale,
    x = rPos.x * scale,
    y = ePos.y * scale,
    xx = block.width + x,
    yy = block.height + y,
    s = workspace.getMetrics();

  if (
    x < s.viewLeft + offsetX - 4 ||
    xx > s.viewLeft + s.viewWidth ||
    y < s.viewTop + offsetY - 4 ||
    yy > s.viewTop + s.viewHeight
  ) {
    let sx = x - s.contentLeft - offsetX,
      sy = y - s.contentTop - offsetY;

    workspace.scrollbar.set(sx, sy);
  }
}

// https://github.com/TurboWarp/scratch-gui/blob/develop/src/addons/addons/find-bar/blockly/BlockFlasher.js

const currentFlash = { block: null, timerID: null } as any;

/** Flash a script for identification purposes */
export function flash(block: any) {
  if (currentFlash.timerID > 0) {
    clearTimeout(currentFlash.timerID);
    if (currentFlash.block.svgGroup_) {
      currentFlash.block.svgGroup_
        .querySelectorAll("path")
        .forEach((e: SVGElement) => (e.style.fill = ""));
    }
  }

  let count = 4;
  let flashOn = true;
  currentFlash.block = block;

  const _flash = () => {
    if (currentFlash.block.svgGroup_) {
      currentFlash.block.svgGroup_
        .querySelectorAll("path")
        .forEach((e: SVGElement) => (e.style.fill = flashOn ? "#ffff80" : ""));
    }
    flashOn = !flashOn;
    count--;
    if (count > 0) {
      currentFlash.timerID = setTimeout(_flash, 200);
    } else {
      currentFlash.timerID = 0;
      currentFlash.block = null;
    }
  };

  _flash();
}
