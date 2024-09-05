import { cls, sprites } from "../components/accessors";
import van from "vanjs-core";

const { div, i } = van.tags;

const Delete = (props: {}, children: HTMLDivElement) =>
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
  Delete(
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
  Delete(
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
