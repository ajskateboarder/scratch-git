/** Test if a URL is syntactically valid or not. */
export const validURL = (url: string) => {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
};

/** Return the React event handler hash for an element */
export const getReactHandlers = (element: Element) => {
  return Object.keys(element).find((e) =>
    e.startsWith("__reactEventHandlers")
  )!;
};
