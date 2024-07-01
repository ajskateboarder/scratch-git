const getItem = <T>(name: string, _default: any = null): T | null => {
    const value = localStorage.getItem(`scratch-git:${name}`) ?? String(_default);
    return typeof value === "string" ? value : JSON.parse(value)
}

const setItem = (name: string, value: any) =>
    localStorage.setItem(`scratch-git:${name}`, typeof value === "string" ? value : JSON.stringify(value));

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
        setItem("scriptcolor", value)
    },

    init() {
        setItem("highlights", getItem("highlights", false));
        setItem("plaintext", getItem("plaintext", false));
        setItem("scriptcolor", getItem("scriptcolor", "#ed25cf"));
    }
};
