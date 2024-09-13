import { cls, Settings } from "./accessors";
import van, { Props } from "vanjs-core";

const { div, label, input, span } = van.tags;

export const Checkbox = (props: Props, name: string) =>
  div(
    { class: Settings.settingsLabel, ...props },
    label(
      { class: Settings.settingsLabel, style: "display: flex" },
      input({
        class: cls(Settings.settingsCheckbox, Settings.checkbox),
        type: "checkbox",
        checked: false,
      }),
      span(name)
    )
  );
