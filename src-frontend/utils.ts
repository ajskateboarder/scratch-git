import type { Project } from "./api";

/** Test if a URL is syntactically valid or not. */
export const isValidURL = (url: string) => {
  try {
    return Boolean(new URL(url));
  } catch {
    return false;
  }
};

/** Test if an email is syntactically valid or not. */
export const isValidEmail = (email: string) => {
  return email
    .toLowerCase()
    .match(
      /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|.(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    );
};

/** Check if a project's configured remote URL is a GitHub URL
 *
 * @param project - the project to be checked
 */
export const repoIsGitHub = async (project: Project) =>
  new URL((await project!.getDetails()).repository).host === "github.com";

/** Zip two arrays similar to Python's itertools.zip_longest */
export const zip = <T, K>(a: T[], b: K[]) =>
  Array.from(Array(Math.max(b.length, a.length)), (_, i) => [
    a[i] ?? "",
    b[i] ?? "",
  ]);

/** Return the React event handler hash for an element */
export const getReactHandlers = (element: Element) => {
  return Object.keys(element).find((e) =>
    e.startsWith("__reactEventHandlers")
  )!;
};
