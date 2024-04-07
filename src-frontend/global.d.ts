import { PropsWithKnownKeys } from "./lib/van";

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

declare type ElemType<T extends keyof HTMLElement> = (
  props: PropsWithKnownKeys<T>,
  ...args: any[]
) => T;
