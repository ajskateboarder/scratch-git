const SETTINGS_KEY = "scratch-git:settings";

export const DEFAULTS = {
  highlights: false,
  plainText: false,
  scriptColor: "#ed25cf",
  unified: false,
  imgAddColor: "#00ff00",
  imgRmColor: "#ff0000",
};

export const userSettings: {
  highlights: boolean;
  plainText: boolean;
  scriptColor: string;
  unified: boolean;
  imgAddColor: string;
  imgRmColor: string;
} = new Proxy({} as any, {
  get(_, name) {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)!)[name];
  },
  set(_, name, value) {
    const settings = JSON.parse(localStorage.getItem(SETTINGS_KEY)!);
    settings[name] = value;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return true;
  },
});

export const setDefaults = () =>
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULTS));

export const clearSettings = () => localStorage.removeItem(SETTINGS_KEY);

if (!localStorage.getItem(SETTINGS_KEY)) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULTS));
}
