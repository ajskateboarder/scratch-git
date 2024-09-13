import { cls, sprites } from "../components/accessors";
import van, { PropsWithKnownKeys } from "vanjs-core";

const { div, i } = van.tags;

type Props = PropsWithKnownKeys<HTMLElement> & {class?: string}

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

export const SpriteDiff = (props: Props) =>
  Delete(
    {
      class: cls(sprites.delete, sprites.spriteSelDelete, "sprite-diff"),
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

export const StageDiff = (props: Props) =>
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
