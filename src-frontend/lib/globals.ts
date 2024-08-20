import "@turbowarp/types";
import "@turbowarp/types/types/scratch-gui";

export interface Block {
  getRootBlock(): any;
  getRelativeToSurfaceXY(): {
    x: number;
    y: number;
  };
  getOutputShape(): unknown;
  getSurroundParent(): Block;
  width: number;
  height: number;
  svgGroup_: SVGElement;
  svgPath_: SVGElement;
  id: string;
  comment: {
    getLabelText(): string;
  } | null;
}

interface Workspace {
  getBlockById(id: string): Block | null;
  getMetrics(): {
    viewLeft: number;
    viewTop: number;
    viewWidth: number;
    viewHeight: number;
    contentLeft: number;
    contentTop: number;
  };
  scale: number;
  scrollbar: {
    set(x: number, y: number): void;
  };
  topBlocks_: Block[];
}

export const getBlockly = (): Workspace => window.Blockly.getMainWorkspace();
export const Redux: {
  dispatch(event: ScratchGUI.ReduxEvent): any;
  getState(): ScratchGUI.ReduxState;
} = window.ReduxStore;
export const vm: VM = window.vm;
