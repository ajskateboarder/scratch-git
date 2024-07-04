const getItem = (name: string, _default: any = null) => {
  const value = localStorage.getItem(`scratch-git:${name}`) ?? String(_default);
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const setItem = (name: string, value: any) =>
  localStorage.setItem(
    `scratch-git:${name}`,
    typeof value === "string" ? value : JSON.stringify(value)
  );

export const defaults = {
  highlights: false,
  plainText: false,
  scriptColor: "#ed25cf",
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

  init() {
    setItem("highlights", getItem("highlights", defaults.highlights));
    setItem("plaintext", getItem("plaintext", defaults.plainText));
    setItem("scriptcolor", getItem("scriptcolor", defaults.scriptColor));
  },

  setDefaults() {
    setItem("highlights", defaults.highlights);
    setItem("plaintext", defaults.plainText);
    setItem("scriptcolor", defaults.scriptColor);
  },
};
