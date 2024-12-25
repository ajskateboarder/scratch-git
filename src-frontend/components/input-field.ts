import { cls, Settings } from "./accessors";
import van, { ChildDom, Props } from "vanjs-core";

const { p, input } = van.tags;

export const InputField = (props: Props, ...children: ChildDom[]) =>
  p({ class: "input-field", ...props }, children);

export const InputBox = (props: Props = {}) =>
  input({
    ...props,
    type: "text",
    class: cls(Settings.inputField, "input-box"),
  });
