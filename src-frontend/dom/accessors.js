/** @file A lookup to create elements using scratch-gui classnames */
// this could've used css selectors but ig i'm too lazy to move now

/** @type {string[]} */
const classNames = [...[...document.styleSheets].map((e) => e.cssRules)]
  .map((e) => Array.from(e))
  .flatMap((e) => e)
  .map((e) => e.selectorText)
  .filter((e) => e !== undefined)
  .map((e) => e.slice(1));

const s = (className) => classNames.filter((e) => e.includes(className))[0];

/**
 * Accessors for parts of the UI
 * @enum
 */
export const Cmp = {
  // menu
  MENU_CONTAINER: s("menu-bar_main-menu"),
  MENU_BAR: s("menu-bar_menu-bar"),
  MENU_POSITION: s("gui_menu-bar-position"),
  MENU_ITEM: s("menu-bar_menu-bar-item"),
  MENU_ITEM_ACTIVE: s("menu-bar_active").split(",")[0].split(".")[1],
  MENU_ACCOUNTINFOGROUP: s("menu-bar_account-info-group"),
  MENU_SECTION: s("menu_menu-section"),

  // alerts
  ALERT_CONTAINER: s("alerts_alerts-inner-container"),
  ALERT_DIALOG: s("alert_alert"),
  ALERT_SUCCESS: s("alert_success").split(".")[1],
  ALERT_MESSAGE: s("alert_alert-message"),
  ALERT_BUTTONS: s("alert_alert-buttons"),
  ALERT_CLOSE_CONTAINER: s("alert_alert-close-button-container"),
  ALERT_CLOSE_BUTTON: s("alert_alert-close-button"),

  // sprites/stage
  DELETE_BUTTON: s("delete-button_delete-button"),
  DELETE_BUTTON_VISIBLE: s("delete-button_delete-button-visible"),
  DELETE_BUTTON_ICON: s("delete-button_delete-icon"),
  SELECTOR_ITEM_DELETE_BUTTON: s("sprite-selector-item_delete-button"),
  SPRITES: s("sprite-selector_items-wrapper"),
  SPRITE_NAME: s("sprite-selector-item_sprite-name").split(",")[0],
  SELECTED_SPRITE: s("sprite-selector-item_is-selected").split(".")[1],
  STAGE_WRAPPER: s("target-pane_stage-selector-wrapper"),

  // settings
  SETTINGS_LABEL: s("settings-modal_label"),
  SETTINGS_CHECKBOX: s("settings-modal_checkbox"),
  CHECKBOX: s("checkbox_checkbox"),

  // misc
  SAVE_STATUS: s("save-status_save-now"),
  BOX: s("box_box"),
  SETTINGS_BUTTON: s("settings-modal_button"),
  CLOSE_BUTTON: s("close-button_close-button"),
  CLOSE_BUTTON_LARGE: s("close-button_large").split(".")[1].split(":")[0],
  CLOSE_ICON: s("close-button_close-icon"),
  DISABLED_BUTTON: s("button_mod-disabled"),
  GUI_PAGE_WRAPPER: s("gui_page-wrapper"),
};
window.Cmp = Cmp;
