import van, { State } from "vanjs-core";
import { Diff } from ".";
import iconCodeSvg from "./code.svg";
import { cls, settings } from "@/components";
import { ScriptParse } from "@/diff-indicators/script-parser";

const { input, label, span, ul, li, i, br, button } = van.tags;

export const createSprite = (name: string, blocks: any) =>
  JSON.stringify({
    isStage: false,
    name,
    variables: {},
    lists: {},
    broadcasts: {},
    blocks,
    comments: {},
    currentCostume: 1,
    costumes: [],
    sounds: [],
    volume: 100,
    visible: false,
    x: 0,
    y: 0,
    size: 100,
    direction: 90,
    draggable: false,
    rotationStyle: "all around",
  });

const states: State<boolean>[] = [];

const RevertButton = (e: ScriptParse, index: number) => {
  const inp = input({
    type: "checkbox",
    name: index,
    onchange: () => {
      ticked.val = inp.checked;
    },
  });
  const ticked = van.state(false);
  states.push(ticked);
  return label(
    span(
      {
        class: "revert-icon",
        title: () => `Using script ${ticked.val ? "after" : "before"} changes`,
      },
      () =>
        i({
          class: `fa-solid fa-sm fa-rotate-${ticked.val ? "right" : "left"}`,
        })
    ),
    inp,
    span(iconCodeSvg(), e.scriptNo)
  );
};

export const Revert = ({
  diffs,
  onsubmit,
}: {
  diffs: ScriptParse[];
  onsubmit: (e: KeyboardEvent) => any;
}) => {
  states.length = 0;
  return (
    ul(
      li(
        input({
          type: "checkbox",
          onchange: (e: Event) => {
            const target = e.target! as HTMLInputElement;
            [
              ...target.parentElement!.parentElement!.querySelectorAll<HTMLInputElement>(
                "input[type=checkbox]"
              ),
            ]
              .slice(1)
              .forEach((_e, _i) => {
                _e.checked = target.checked;
                states[_i].val = target.checked;
              });
          },
        })
      ),
      diffs.map((e, _i) => li(RevertButton(e, _i)))
    ),
    br(),
    button({
      class: cls("fa-solid fa-check", settings.button),
      title: "Click while holding shift to replace original sprite",
      style: "padding: 0.3rem",
      onclick: (e: KeyboardEvent) => onsubmit(e),
    })
  );
};
