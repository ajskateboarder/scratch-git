const NS = "scratch-git";

const getItem = (name: string, _default: any = null) => {
  const value = localStorage.getItem(`${NS}:${name}`) ?? String(_default);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};
const delItem = (name: string) => localStorage.removeItem(`${NS}:${name}`);
const setItem = (name: string, value: any) =>
  localStorage.setItem(
    `${NS}:${name}`,
    typeof value === "string" ? value : JSON.stringify(value)
  );

export const DEFAULTS = {
  highlights: false,
  plainText: false,
  scriptColor: "#ed25cf",
  imgAddColor: "#ff0000",
  imgRmColor: "#00ff00",
  unified: false,
};

type Default = keyof typeof DEFAULTS;

const DEFAULTS_MAP: Record<Default, string> = {
  highlights: "highlights",
  plainText: "plaintext",
  scriptColor: "scriptcolor",
  imgAddColor: "imgaddcolor",
  imgRmColor: "imgrmcolor",
  unified: "unified",
};

const _userSettings: Record<Default, any> = new Proxy(DEFAULTS, {
  set(_, prop: string, value) {
    setItem(prop, value);
    return true;
  },
  get(_, prop: string) {
    return getItem(prop);
  },
});

export const userSettings = {
  ..._userSettings,

  init() {
    for (const [key, value] of Object.entries(DEFAULTS_MAP)) {
      setItem(value, getItem(value, DEFAULTS[key as Default]));
    }
  },

  clear() {
    for (const key in Object.values(DEFAULTS_MAP)) {
      delItem(key);
    }
  },

  defaults() {
    for (const [key, value] of Object.entries(DEFAULTS_MAP)) {
      setItem(value, DEFAULTS[key as Default]);
    }
  },
};
