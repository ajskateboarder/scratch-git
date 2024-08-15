const CLASS_NAMES: string[] = [
  ...[...document.styleSheets].map((e) => e.cssRules),
]
  .map((e) => Array.from(e))
  .flatMap((e) => e)
  .map((e: any) => e.selectorText)
  .filter((e) => e !== undefined)
  .map((e) => e.slice(1));

/** Finds the first hashed class name that matches */
export const s = (className: string) => {
  let _className = CLASS_NAMES.find((e) => e.includes(className))!.split(
    ","
  )[0];
  if (_className.includes(".")) {
    _className = _className.split(".")[1];
  }
  className = _className.split(":")[0];
  return Object.assign(className, {
    select: <T extends Element>(elem: string = ""): T =>
      document.querySelector<T>(`${elem}.${className}`)! as T,
    selectAll: <T extends Element>(elem: string = ""): T[] =>
      [...document.querySelectorAll<T>(`${elem}.${className}`)!] as T[],
  });
};

(window as any).s = s;

/** Join class names into a valid attribute */
export const cls = (...classes: (string | undefined)[]) => classes.join(" ");

export const menu = {
  activeMenuItem: s("menu-bar_active"),
  section: s("menu_menu-section"),
};

export const sprites = {
  delete: s("delete-button_delete-button"),
  visibleDelete: s("delete-button_delete-button-visible"),
  spriteSelDelete: s("sprite-selector-item_delete-button"),
  spriteName: s("sprite-selector-item_sprite-name"),
  selectedSprite: s("sprite-selector-item_is-selected"),
  stageWrapper: s("target-pane_stage-selector-wrapper"),
};

export const settings = {
  settingsLabel: s("settings-modal_label"),
  settingsCheckbox: s("settings-modal_checkbox"),
  checkbox: s("checkbox_checkbox"),
  button: s("settings-modal_button"),
  disabledButton: s("button_mod-disabled"),
  inputField: s("input_input-form"),
};

export const misc = {
  box: s("box_box"),
  menuItems: s("menu-bar_file-group"),
  saveArea: s("menu-bar_account-info-group"),
  card: s("card_card"),
  cardButtons: s("card_header-buttons"),
};
