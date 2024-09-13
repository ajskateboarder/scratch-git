import { cls, Misc, s } from "@/components/accessors";
import { CLOSE_BUTTON_SVG } from "@/components/alerts";
import van, { ChildDom } from "vanjs-core";

const { div, img } = van.tags;

export const Modal = (children: ChildDom, title: string, closeCb: () => any) =>
  div(
    {
      class: "ReactModalPortal",
    },
    div(
      {
        class: cls(
          "ReactModal__Overlay",
          "ReactModal__Overlay--after-open",
          s("modal_modal-overlay")
        ),
      },
      div(
        {
          class: cls(
            "ReactModal__Content",
            "ReactModal__Content--after-open",
            s("modal_modal-content"),
            s("settings-modal_modal-content")
          ),
          tabIndex: "-1",
          role: "dialog",
          ariaLabel: title,
        },
        div(
          {
            class: Misc.box,
            dir: "ltr",
            style: "flex-direction: column; flex-grow: 1",
          },
          div(
            { class: s("modal_header") },
            div(
              {
                class: cls(
                  s("modal_header-item"),
                  s("modal_header-item-title")
                ),
              },
              title
            ),
            div(
              {
                class: cls(
                  s("modal_header-item"),
                  s("modal_header-item-close")
                ),
              },
              div(
                {
                  class: cls(
                    s("close-button_close-button"),
                    s("close-button_large")
                  ),
                  role: "button",
                  tabIndex: "0",
                  onclick: closeCb,
                },
                img({
                  class: s("close-button_close-icon"),
                  src: CLOSE_BUTTON_SVG,
                  draggable: "false",
                })
              )
            )
          ),
          div({ class: cls(s("settings-modal_body"), Misc.box) }, children)
        )
      )
    )
  );
