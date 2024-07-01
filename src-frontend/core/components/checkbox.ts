import { settings } from "./accessors";
import van, { PropsWithKnownKeys } from "vanjs-core";

const { div, label, input, span } = van.tags;

export const Checkbox = (props: PropsWithKnownKeys<HTMLDivElement>, name: string) =>
  div(
    { class: settings.settingsLabel, ...props },
    label(
      { class: settings.settingsLabel },
      input({
        class: [settings.settingsCheckbox, settings.checkbox].join(" "),
        type: "checkbox",
        checked: false,
      }),
      span(name),
    ),
  );