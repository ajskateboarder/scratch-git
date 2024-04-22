import initialize from "./initialize";
import "./lib/index";
declare global {
  interface Window {
    ReduxStore: {
      getState: () => {
        scratchGui: {
          theme: {
            theme: {
              blocks: "three" | "dark" | "high-contrast";
              gui: "light" | "dark";
            };
          };
        };
      };
    };
    vm: any;
    scratchblocks: any;
    parseSB3Blocks: any;
    Blockly: any;
  }
}

(async () => {
  // avoids scenarios where scratch.git initializes before the editor is finished
  window.vm.runtime.on(
    "ASSET_PROGRESS",
    async (finished: number, total: number) => {
      if (finished === total && finished > 0 && total > 0) {
        setTimeout(async () => await initialize(), 0.1);
      }
    }
  );
})();
