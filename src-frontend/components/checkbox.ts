import van from "vanjs-core";
import { settings } from "./accessors";

const { div, label, input, span } = van.tags;

export const Checkbox = (props: {}, name: string) =>
  div(
    { class: settings.settingsLabel, ...props },
    label(
      { class: settings.settingsLabel },
      input({
        class: [settings.settingsCheckbox, settings.checkbox].join(" "),
        type: "checkbox",
        checked: false,
      }),
      span(name)
    )
  );
