/** @file A lookup to create elements using scratch-gui classnames */

const classNames: string[] = [
  ...[...document.styleSheets].map((e) => e.cssRules),
]
  .map((e) => Array.from(e))
  .flatMap((e) => e)
  .map((e: any) => e.selectorText)
  .filter((e) => e !== undefined)
  .map((e) => e.slice(1));

const s = (className: string) =>
  classNames.filter((e) => e.includes(className))[0];

export const menu = {
  container: s("menu-bar_main-menu"),
  menuBar: s("menu-bar_menu-bar"),
  menuPos: s("gui_menu-bar-position"),
  menuItem: s("menu-bar_menu-bar-item"),
  activeMenuItem: s("menu-bar_active").split(",")[0].split(".")[1],
  menuSection: s("menu_menu-section"),
};

export const alert = {
  alertContainer: s("alerts_alerts-inner-container"),
  alertDialog: s("alert_alert"),
  alertSuccess: s("alert_success").split(".")[1],
  alertMessage: s("alert_alert-message"),
  alertButtons: s("alert_alert-buttons"),
  alertClose: s("alert_alert-close-button-container"),
};

export const sprites = {
  delete: s("delete-button_delete-button"),
  visibleDelete: s("delete-button_delete-button-visible"),
  deleteIcon: s("delete-button_delete-icon"),
  spriteSelDelete: s("sprite-selector-item_delete-button"),
  sprites: s("sprite-selector_items-wrapper"),
  spriteName: s("sprite-selector-item_sprite-name").split(",")[0],
  selectedSprite: s("sprite-selector-item_is-selected").split(".")[1],
  stageWrapper: s("target-pane_stage-selector-wrapper"),
};

export const settings = {
  settingsLabel: s("settings-modal_label"),
  settingsCheckbox: s("settings-modal_checkbox"),
  settingsButton: s("settings-modal_button"),
  checkbox: s("checkbox_checkbox"),
  disabledButton: s("button_mod-disabled"),
};

export const misc = {
  saveStatus: s("save-status_save-now"),
  box: s("box_box"),
  close: s("close-button_close-button"),
  largeClose: s("close-button_large").split(".")[1].split(":")[0],
  guiWrapper: s("gui_page-wrapper"),
};
