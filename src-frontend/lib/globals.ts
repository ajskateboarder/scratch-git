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

let internalKey: string | undefined;

export const getBlockly = (): Workspace => {
    const wrapper = document.querySelector(`[class^="gui_blocks-wrapper"]`);
    if (!wrapper) {
      throw new Error("Failed to get Blockly. Not in editor?")
    };

    internalKey ??= Object.keys(wrapper).find((key) => key.startsWith("__reactInternalInstance"));
    const internal = (wrapper as any)[internalKey!];
  
    let childable = internal;
    while (((childable = childable.child), !childable || !childable.stateNode || !childable.stateNode.ScratchBlocks)) { }
  
    return childable.stateNode.ScratchBlocks.getMainWorkspace();
};

export const Redux: {
  dispatch(event: ScratchGUI.ReduxEvent): any;
  getState(): ScratchGUI.ReduxState;
} = window.ReduxStore;

export const vm: VM = window.vm;
