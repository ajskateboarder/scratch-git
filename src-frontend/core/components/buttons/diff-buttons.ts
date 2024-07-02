import { cls, sprites } from "../accessors";
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
    children
  );

export const SpriteDiff = (props: {}) =>
  BaseDelete(
    {
      class: cls(sprites.delete, sprites.spriteSelDelete, "diff-button"),
      ...props,
    },
    div(
      { class: sprites.visibleDelete },
      i({
        class: cls("fa-solid", "fa-plus-minus", "fa-lg"),
        style: "color: white",
      })
    )
  );

export const StageDiff = (props: {}) =>
  BaseDelete(
    {
      class: cls(sprites.delete, sprites.spriteSelDelete, "stage-diff"),
      ...props,
    },
    div(
      { class: sprites.visibleDelete },
      i({
        class: cls("fa-solid", "fa-plus-minus", "fa-sm"),
        style: "color: white",
      })
    )
  );
