declare global {
  interface Window {
    Blockly: any;
    ReduxStore: any;
    vm: any;
    _changedScripts: string[];
  }
}

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
}

interface Workspace {
  getBlockById(id: string): Block;
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

interface State {
  scratchGui: {
    projectTitle: string;
    theme: {
      theme: {
        gui: "light" | "dark";
        blocks: "three" | "high-contrast" | "dark";
      };
    };
    editorTab: {
      activeTabIndex: number;
    };
    locales: {
      locale: string;
    };
  };
}

interface ReduxStore {
  getState(): State;
  dispatch(_: { type: string; [key: string]: string | undefined }): void;
}

interface VMRuntime {
  on(type: string, callback: (...e: any[]) => void): void;
}

export const getBlockly = (): Workspace => window.Blockly.getMainWorkspace();
export const Redux: ReduxStore = window.ReduxStore;
export const VM: VMRuntime = window.vm.runtime;
