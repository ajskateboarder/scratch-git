// only use colors in non-browser environments
const addColors = typeof document === "undefined";

const RESET = addColors ? "\u001b[0m" : "";
const GRAY = addColors ? "\u001b[90m" : "";
const BLUE = addColors ? "\u001b[34m" : "";
const CYAN = addColors ? "\u001b[36m" : "";
const YELLOW = addColors ? "\u001b[33m" : "";
const RED = addColors ? "\u001b[31m" : "";

const DEBUG = `${BLUE}debug${RESET}`;
const INFO = `${CYAN}info${RESET}`;
const WARN = `${YELLOW}warn${RESET}`;
const ERROR = `${RED}error${RESET}`;

export const createLog = (namespace = "") => {
  const log = (childNamespace: string) =>
    createLog(namespace ? `${namespace} ${childNamespace}` : childNamespace);

  const formattedNamespace = namespace ? [`${GRAY}${namespace}${RESET}`] : [];

  log.debug = log.log = (...args: any[]) =>
    console.debug(...formattedNamespace, DEBUG, ...args);
  log.info = (...args: any[]) =>
    console.info(...formattedNamespace, INFO, ...args);
  log.warn = (...args: any[]) =>
    console.warn(...formattedNamespace, WARN, ...args);
  log.error = (...args: any[]) =>
    console.error(...formattedNamespace, ERROR, ...args);

  return log;
};
