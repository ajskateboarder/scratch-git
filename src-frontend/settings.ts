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
  unified: false,
  imgAddColor: "#00ff00",
  imgRmColor: "#ff0000",
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

  get imgAddColor() {
    return getItem("imgaddcolor")!;
  },
  set imgAddColor(value: string) {
    setItem("imgaddcolor", value);
  },

  get imgRmColor() {
    return getItem("imgrmcolor")!;
  },
  set imgRmColor(value: string) {
    setItem("imgrmcolor", value);
  },

  init() {
    setItem("highlights", getItem("highlights", DEFAULTS.highlights));
    setItem("plaintext", getItem("plaintext", DEFAULTS.plainText));
    setItem("scriptcolor", getItem("scriptcolor", DEFAULTS.scriptColor));
    setItem("unified", getItem("unified", DEFAULTS.scriptColor));
    setItem("imgaddcolor", getItem("imgaddcolor", DEFAULTS.imgAddColor));
    setItem("imgrmcolor", getItem("imgrmcolor", DEFAULTS.imgRmColor));
  },

  clear() {
    delItem("highlights");
    delItem("plaintext");
    delItem("scriptcolor");
    delItem("imgaddcolor");
    delItem("imgrmcolor");
  },

  defaults() {
    setItem("highlights", DEFAULTS.highlights);
    setItem("plaintext", DEFAULTS.plainText);
    setItem("scriptcolor", DEFAULTS.scriptColor);
    setItem("imgaddcolor", DEFAULTS.imgAddColor);
    setItem("imgrmcolor", DEFAULTS.imgRmColor);
  },
};
