interface Window {
  ReduxStore: {
    dispatch: (_: { type: string; [key: string] }) => void;
    getState: () => {
      scratchGui: {
        theme: {
          theme: {
            blocks: "three" | "dark" | "high-contrast";
            gui: "light" | "dark";
          };
        };
        editorTab: {
          activeTabIndex: 0 | 1 | 2;
        };
      };
      locales: {
        locale: string;
      };
    };
  };
  vm: any;
  Blockly: any;
  _lib: {
    scratchblocks: {
      appendStyles: () => void;
      renderMatching: (loc: string, config: {}) => void;
    };
    parseSB3Blocks: {
      toScratchblocks: (
        script: string,
        json: {},
        language: string,
        config: {}
      ) => string;
    };
  };
  _changedScripts: string[];
}
