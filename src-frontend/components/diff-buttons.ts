import { sprites } from "./accessors";
import van from "vanjs-core";

const { div, i } = van.tags;

const BaseDelete = (props: {}, children: HTMLDivElement) =>
  div(
    {
      ariaLabel: "Diff",
      role: "button",
      tabIndex: 0,
      ...props,
    },
    children,
  );

export const SpriteDiff = (props: {}) =>
  BaseDelete(
    {
      class: [sprites.delete, sprites.spriteSelDelete, "diff-button"].join(" "),
      ...props,
    },
    div(
      { class: sprites.visibleDelete },
      i({
        class: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" "),
        style: "color: white",
      }),
    ),
  );

export const StageDiff = (props: {}) =>
  BaseDelete(
    {
      class: [sprites.delete, sprites.spriteSelDelete, "stage-diff"].join(" "),
      ...props,
    },
    div(
      { class: sprites.visibleDelete },
      i({
        class: ["fa-solid", "fa-plus-minus", "fa-sm"].join(" "),
        style: "color: white",
      }),
    ),
  );
