import { cls, settings } from "./accessors";
import van, { PropsWithKnownKeys } from "vanjs-core";

const { div, label, input, span } = van.tags;

export const Checkbox = (
  props: PropsWithKnownKeys<HTMLDivElement>,
  name: string
) =>
  div(
    { class: settings.settingsLabel, ...props },
    label(
      { class: settings.settingsLabel, style: "display: flex" },
      input({
        class: cls(settings.settingsCheckbox, settings.checkbox),
        type: "checkbox",
        checked: false,
      }),
      span(name)
    )
  );
