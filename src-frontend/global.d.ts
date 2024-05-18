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
        projectTitle: string;
      };
      locales: {
        locale: string;
      };
    };
  };
  vm: any;
  Blockly: any;
  // TODO: bind changed scripts per-project
  _changedScripts: string[];
}

type TypedEventTarget<EventMap extends object> = {
  new (): IntermediateEventTarget<EventMap>;
};

interface IntermediateEventTarget<EventMap> extends EventTarget {
  addEventListener<K extends keyof EventMap>(
    type: K,
    callback: (
      event: EventMap[K] extends Event ? EventMap[K] : never
    ) => EventMap[K] extends Event ? void : never,
    options?: boolean | AddEventListenerOptions
  ): void;

  addEventListener(
    type: string,
    callback: EventListenerOrEventListenerObject | null,
    options?: EventListenerOptions | boolean
  ): void;
}
