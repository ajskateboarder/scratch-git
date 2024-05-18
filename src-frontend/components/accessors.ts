/** @file A lookup to create elements using scratch-gui classnames */

const classNames: string[] = [
  ...[...document.styleSheets].map((e) => e.cssRules),
]
  .map((e) => Array.from(e))
  .flatMap((e) => e)
  .map((e: any) => e.selectorText)
  .filter((e) => e !== undefined)
  .map((e) => e.slice(1));

const s = (className: string) => {
  let _className = classNames.find((e) => e.includes(className))!.split(",")[0];
  if (_className.includes(".")) {
    _className = _className.split(".")[1];
  }
  return _className.split(":")[0];
};

export const menu = {
  container: s("menu-bar_main-menu"),
  menuBar: s("menu-bar_menu-bar"),
  menuPos: s("gui_menu-bar-position"),
  menuItem: s("menu-bar_menu-bar-item"),
  activeMenuItem: s("menu-bar_active"),
  menuSection: s("menu_menu-section"),
  menuList: s("menu-bar_menu-bar-menu"),
  languageMenu: s("settings-menu_language-submenu"),
};

export const alert = {
  container: s("alerts_alerts-inner-container"),
  dialog: s("alert_alert"),
  message: s("alert_alert-message"),
  buttons: s("alert_alert-buttons"),
  close: s("alert_alert-close-button-container"),
  success: s("alert_success"),
  warn: s("alert_warn"),
};

export const sprites = {
  delete: s("delete-button_delete-button"),
  visibleDelete: s("delete-button_delete-button-visible"),
  deleteIcon: s("delete-button_delete-icon"),
  spriteSelDelete: s("sprite-selector-item_delete-button"),
  sprites: s("sprite-selector_items-wrapper"),
  spriteName: s("sprite-selector-item_sprite-name"),
  selectedSprite: s("sprite-selector-item_is-selected"),
  stageWrapper: s("target-pane_stage-selector-wrapper"),
};

export const settings = {
  settingsLabel: s("settings-modal_label"),
  settingsCheckbox: s("settings-modal_checkbox"),
  settingsButton: s("settings-modal_button"),
  checkbox: s("checkbox_checkbox"),
  disabledButton: s("button_mod-disabled"),
  inputField: s("input_input-form"),
  disabledInput: s("input-group_disabled"),
};

export const misc = {
  saveStatus: s("save-status_save-now"),
  box: s("box_box"),
  close: s("close-button_close-button"),
  largeClose: s("close-button_large"),
  guiWrapper: s("gui_page-wrapper"),
  selectedTab: s("react-tabs_react-tabs__tab--selected"),
  menuItems: s("menu-bar_file-group"),
  saveArea: s("menu-bar_account-info-group"),
};
