import van from "vanjs-core";

const { button, i } = van.tags;

export const ReloadButton = () =>
  button(
    { class: "alert-button", onclick: () => location.reload() },
    i({ class: "fa-solid fa-rotate-right" })
  );
