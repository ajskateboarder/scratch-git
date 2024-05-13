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
  _changedScripts: string[];
}
