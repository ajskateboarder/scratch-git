import van from "vanjs-core";

const { div, button, i } = van.tags;

export const DropdownMenu = (...children: HTMLElement[]) => {
  const content = div(
    { class: "dropdown-content", style: "display: none" },
    ...children.map((e) => {
      const oldOnClick = e.onclick?.bind(e);
      e.onclick = (ev) => {
        if (oldOnClick) oldOnClick(ev);
        content.style.display = "none";
      };
      return e;
    })
  );

  const dropdown = div(
    { class: "dropdown" },
    button(
      {
        onclick: () => {
          content.style.display =
            content.style.display === "none" ? "" : "none";
        },
      },
      i({ class: "fa-solid fa-ellipsis" })
    ),
    content
  );

  document.addEventListener("click", (event) => {
    if (!dropdown.contains(event.target as HTMLElement)) {
      content.style.display = "none";
    }
  });

  return dropdown;
};
