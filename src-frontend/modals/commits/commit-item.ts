import type { Commit } from "@/api";
import van from "vanjs-core";

const { div, br, span } = van.tags;

const RANGES = {
  years: 3600 * 24 * 365,
  months: 3600 * 24 * 30,
  weeks: 3600 * 24 * 7,
  days: 3600 * 24,
  hours: 3600,
  minutes: 60,
  seconds: 1,
};

// https://stackoverflow.com/a/69122877/16019146
const timeAgo = (input: Date | string) => {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");

  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  const matched = Object.keys(RANGES).find(
    (key) => RANGES[key as keyof typeof RANGES] < Math.abs(secondsElapsed)
  ) as keyof typeof RANGES;
  return formatter.format(
    Math.round(secondsElapsed / RANGES[matched]),
    matched as Intl.RelativeTimeFormatUnit
  );
};

const highlight = (fullText: string, search: string) => {
  if (search !== "") {
    const text = new Option(fullText).innerHTML;
    const newText = text.replaceAll(
      new RegExp(search.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
      `<mark>${search}</mark>`
    );
    return span({ innerHTML: newText });
  }
  return fullText;
};

export const CommitItem = (
  commit: Commit,
  search: string,
  dropdown: HTMLElement
) =>
  div(
    { class: "commit" },
    span(
      span({ style: "font-size: 1rem" }, highlight(commit.subject, search)),
      br(),
      span(
        { style: "font-size: 0.75rem", title: commit.author.date },
        `${commit.author.name} committed ${timeAgo(commit.author.date)}`
      )
    ),
    span(dropdown)
  );
