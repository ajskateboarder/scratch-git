const ns = "scratch-git";

const getItem = (name: string, _default: any = null) => {
  const value = localStorage.getItem(`${ns}:${name}`) ?? String(_default);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const delItem = (name: string) => localStorage.removeItem(`${ns}:${name}`);

const setItem = (name: string, value: any) =>
  localStorage.setItem(
    `${ns}:${name}`,
    typeof value === "string" ? value : JSON.stringify(value)
  );

export const defaults = {
  highlights: false,
  plainText: false,
  scriptColor: "#ed25cf",
  unified: false,
};

export const userSettings = {
  get highlights() {
    return getItem("highlights")!;
  },
  set highlights(value: boolean) {
    setItem("highlights", value);
  },

  get plainText() {
    return getItem("plaintext")!;
  },
  set plainText(value: boolean) {
    setItem("plaintext", value);
  },

  get scriptColor() {
    return getItem("scriptcolor")!;
  },
  set scriptColor(value: string) {
    setItem("scriptcolor", value);
  },

  get unified() {
    return getItem("unified")!;
  },
  set unified(value: boolean) {
    setItem("unified", value);
  },

  init() {
    setItem("highlights", getItem("highlights", defaults.highlights));
    setItem("plaintext", getItem("plaintext", defaults.plainText));
    setItem("scriptcolor", getItem("scriptcolor", defaults.scriptColor));
    setItem("unified", getItem("unified", defaults.scriptColor));
  },

  clear() {
    delItem("highlights");
    delItem("plaintext");
    delItem("scriptcolor");
  },

  defaults() {
    setItem("highlights", defaults.highlights);
    setItem("plaintext", defaults.plainText);
    setItem("scriptcolor", defaults.scriptColor);
  },
};
