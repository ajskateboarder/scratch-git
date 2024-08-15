import van, { ChildDom } from "vanjs-core";
import { cls, s } from "../../core/accessors";

const { div, img, span } = van.tags;

export const Card = (children: ChildDom, closeCb: () => any) => {
  let mouseOffsetX = 0;
  let mouseOffsetY = 0;
  let lastX = 0;
  let lastY = 0;

  const handleStartDrag = (e: any) => {
    e.preventDefault();
    mouseOffsetX = e.clientX - card.offsetLeft;
    mouseOffsetY = e.clientY - card.offsetTop;
    lastX = e.clientX;
    lastY = e.clientY;
    document.addEventListener("mouseup", () => {
      document.removeEventListener("mouseup", handleStartDrag);
      document.removeEventListener("mousemove", handleDragInterface);
    });
    document.addEventListener("mousemove", handleDragInterface);
  };

  const moveInterface = (x: number, y: number) => {
    lastX = x;
    lastY = y;
    const width =
      (document.documentElement.clientWidth || document.body.clientWidth) - 1;
    const height =
      (document.documentElement.clientHeight || document.body.clientHeight) - 1;
    card.style.left =
      Math.max(0, Math.min(x - mouseOffsetX, width - card.offsetWidth)) + "px";
    card.style.top =
      Math.max(0, Math.min(y - mouseOffsetY, height - card.offsetHeight)) +
      "px";
  };

  const handleDragInterface = (e: any) => {
    e.preventDefault();
    moveInterface(e.clientX, e.clientY);
  };

  window.addEventListener("resize", () => moveInterface(lastX, lastY));

  const header = div(
    {
      class: s("card_header-buttons"),
      onmousedown: handleStartDrag,
    },
    div(
      { class: s("card_header-buttons-right"), style: "margin-left: auto" },
      div(
        {
          class: s("card_shrink-expand-button"),
          onclick: closeCb,
        },
        img({
          src: "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4KPHN2ZyB3aWR0aD0iMjBweCIgaGVpZ2h0PSIyMHB4IiB2aWV3Qm94PSIwIDAgMjAgMjAiIHZlcnNpb249IjEuMSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIiB4bWxuczp4bGluaz0iaHR0cDovL3d3dy53My5vcmcvMTk5OS94bGluayI+CiAgICA8IS0tIEdlbmVyYXRvcjogU2tldGNoIDUzLjIgKDcyNjQzKSAtIGh0dHBzOi8vc2tldGNoYXBwLmNvbSAtLT4KICAgIDx0aXRsZT5FeHRlbnNpb25zL0Nvbm5lY3Rpb24vQ2xvc2U8L3RpdGxlPgogICAgPGRlc2M+Q3JlYXRlZCB3aXRoIFNrZXRjaC48L2Rlc2M+CiAgICA8ZGVmcz4KICAgICAgICA8cGF0aCBkPSJNMTUuNDY0OTM1LDE1LjQ2NzI5NyBDMTQuNzY0NDA1OSwxNi4xNzc3NzA1IDEzLjYxODU4NzcsMTYuMTc3NzcwNSAxMi45MDgxMTQyLDE1LjQ2NzI5NyBMOS45OTg4MTg5OSwxMi41NTgwMDE4IEw3LjA4ODQxODg1LDE1LjQ2NzI5NyBDNi4zODIzNjUwNiwxNi4xNzMzNTA4IDUuMjM3NjUxODcsMTYuMTczMzUwOCA0LjUzMTU5ODA3LDE1LjQ2NzI5NyBDNC4xNzkxMjM2NCwxNS4xMTQ4MjI2IDQuMDAwMTI0MDksMTQuNjQ4NTM5OCA0LjAwMDEyNDA5LDE0LjE4ODg4NjYgQzQuMDAwMTI0MDksMTMuNzI4MTI4NSA0LjE3OTEyMzY0LDEzLjI2Mjk1MDYgNC41MzE1OTgwNywxMi45MTA0NzYyIEw3LjQ0MDg5MzI4LDEwLjAwMTE4MSBMNC41MjcxNzgzMyw3LjA4NjM2MTEyIEM0LjE3MzU5ODk3LDYuNzMyNzgxNzYgMy45OTQ1OTk0MSw2LjI2NzYwMzkxIDQuMDAwMTI0MDksNS44MDI0MjYwNiBDNC4wMDAxMjQwOSw1LjM0MTY2Nzk1IDQuMTczNTk4OTcsNC44ODIwMTQ3NyA0LjUyNzE3ODMzLDQuNTI5NTQwMzQgQzUuMjMyMTI3MTksMy44MjM0ODY1NSA2LjM3Njg0MDM4LDMuODIzNDg2NTUgNy4wODM5OTkxMSw0LjUyOTU0MDM0IEw5Ljk5ODgxODk5LDcuNDQzMjU1MjkgTDEyLjkxMjUzMzksNC41Mjk1NDAzNCBDMTMuNjE4NTg3NywzLjgyMzQ4NjU1IDE0Ljc2NDQwNTksMy44MjM0ODY1NSAxNS40NzA0NTk3LDQuNTI5NTQwMzQgQzE2LjE3NjUxMzQsNS4yMzQ0ODkyIDE2LjE3NjUxMzQsNi4zODAzMDczMyAxNS40NzA0NTk3LDcuMDg2MzYxMTIgTDEyLjU1NDUzNDgsMTAuMDAxMTgxIEwxNS40NzA0NTk3LDEyLjkxNDg5NiBDMTYuMTc2NTEzNCwxMy42MjA5NDk3IDE2LjE3NjUxMzQsMTQuNzU1NzE4NSAxNS40NjQ5MzUsMTUuNDY3Mjk3IiBpZD0icGF0aC0xIj48L3BhdGg+CiAgICA8L2RlZnM+CiAgICA8ZyBpZD0iRXh0ZW5zaW9ucy9Db25uZWN0aW9uL0Nsb3NlIiBzdHJva2U9Im5vbmUiIHN0cm9rZS13aWR0aD0iMSIgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj4KICAgICAgICA8bWFzayBpZD0ibWFzay0yIiBmaWxsPSJ3aGl0ZSI+CiAgICAgICAgICAgIDx1c2UgeGxpbms6aHJlZj0iI3BhdGgtMSI+PC91c2U+CiAgICAgICAgPC9tYXNrPgogICAgICAgIDx1c2UgaWQ9ImNsb3NlIiBmaWxsPSIjRkZGRkZGIiB4bGluazpocmVmPSIjcGF0aC0xIj48L3VzZT4KICAgICAgICA8ZyBpZD0iV2hpdGUiIG1hc2s9InVybCgjbWFzay0yKSIgZmlsbD0iI0ZGRkZGRiI+CiAgICAgICAgICAgIDxyZWN0IGlkPSJDb2xvciIgeD0iMCIgeT0iMCIgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIj48L3JlY3Q+CiAgICAgICAgPC9nPgogICAgPC9nPgo8L3N2Zz4=",
        }),
        span("Close")
      )
    )
  );

  const card = div(
    {
      class: cls(s("card_card_"), "git-card"),
    },
    header,
    div({ style: "overflow-y: auto; cursor: default" }, children)
  );

  return card;
};
