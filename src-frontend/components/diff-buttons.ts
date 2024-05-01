import van from "vanjs-core";
import { sprites } from "./accessors";

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
      className: [sprites.delete, sprites.spriteSelDelete, "diff-button"].join(
        " ",
      ),
      ...props,
    },
    div(
      { className: sprites.visibleDelete },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-lg"].join(" "),
        style: "color: white",
      }),
    ),
  );

export const StageDiff = (props: {}) =>
  BaseDelete(
    {
      className: [sprites.delete, sprites.spriteSelDelete, "stage-diff"].join(
        " ",
      ),
      ...props,
    },
    div(
      { className: sprites.visibleDelete },
      i({
        className: ["fa-solid", "fa-plus-minus", "fa-sm"].join(" "),
        style: "color: white",
      }),
    ),
  );