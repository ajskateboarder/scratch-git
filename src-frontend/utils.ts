export function html(strings, ...values) {
  let result = strings[0];
  values.forEach((e, i) => {
    result += e + strings[i + 1];
  });
  return result;
}

export const guiTheme = (): {
  blocks: "three" | "dark" | "high-contrast";
  gui: "light" | "dark";
} => window.ReduxStore.getState().scratchGui.theme.theme;
