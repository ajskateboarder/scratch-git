import { settings } from ".";
import van, { PropsWithKnownKeys } from "vanjs-core";

const { p, input } = van.tags;

export const InputField = (...children: any[]) =>
  p({ class: "input-field" }, children);

export const InputBox = (props: PropsWithKnownKeys<HTMLInputElement>) =>
  input({
    ...props,
    type: "text",
    class: [settings.inputField, "input-box"].join(" "),
  });
