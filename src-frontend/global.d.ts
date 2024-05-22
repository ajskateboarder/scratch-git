declare module "*.css";
declare module "*.js";

interface Window {
  Blockly: any;
  ReduxStore: any;
  vm: any;
  _changedScripts: string[];
}