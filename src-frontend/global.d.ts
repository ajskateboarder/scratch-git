declare interface Window {
  vm: {
    runtime: {
      on(listener: string, cb: () => any): void;
    };
  };
  scratchblocks: {
    appendStyles(): void;
    renderMatching(
      selector: string,
      options: { style: string; scale: number }
    ): void;
  };
  parseSB3Blocks: {
    toScratchblocks(
      scriptIndex: string,
      project: any,
      language: string = "en",
      options: { tabs: string }
    ): string;
  };
}
