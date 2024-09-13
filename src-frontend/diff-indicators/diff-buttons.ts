import { cls, Sprites } from "../components/accessors";
import van, { Props } from "vanjs-core";

const { div, i } = van.tags;

const Delete = (props: Props, children: HTMLDivElement) =>
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
      class: cls(Sprites.delete, Sprites.spriteSelDelete, "sprite-diff"),
      ...props,
    },
    div(
      { class: Sprites.visibleDelete },
      i({
        class: cls("fa-solid", "fa-plus-minus", "fa-lg"),
        style: "color: white",
      })
    )
  );

export const StageDiff = (props: {}) =>
  Delete(
    {
      class: cls(Sprites.delete, Sprites.spriteSelDelete, "stage-diff"),
      ...props,
    },
    div(
      { class: Sprites.visibleDelete },
      i({
        class: cls("fa-solid", "fa-plus-minus", "fa-sm"),
        style: "color: white",
      })
    )
  );
