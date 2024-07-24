import { cls, settings } from ".";
import van, { PropsWithKnownKeys } from "vanjs-core";

const { p, input } = van.tags;

export const InputField = (
  props: PropsWithKnownKeys<HTMLInputElement>,
  ...children: any[]
) => p({ class: "input-field", ...props }, children);

export const InputBox = (props: PropsWithKnownKeys<HTMLInputElement>) =>
  input({
    ...props,
    type: "text",
    class: cls(settings.inputField, "input-box"),
  });
