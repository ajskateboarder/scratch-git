import type { Commit } from "@/api";
import van from "vanjs-core";

const { div, br, span } = van.tags;

// https://stackoverflow.com/a/69122877/16019146
const timeAgo = (input: Date | string) => {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.RelativeTimeFormat("en");
  const ranges = {
    years: 3600 * 24 * 365,
    months: 3600 * 24 * 30,
    weeks: 3600 * 24 * 7,
    days: 3600 * 24,
    hours: 3600,
    minutes: 60,
    seconds: 1,
  };
  const secondsElapsed = (date.getTime() - Date.now()) / 1000;
  const matched = Object.keys(ranges).find(
    (key) => ranges[key as keyof typeof ranges] < Math.abs(secondsElapsed)
  ) as keyof typeof ranges;
  return formatter.format(
    Math.round(secondsElapsed / ranges[matched]),
    matched as Intl.RelativeTimeFormatUnit
  );
};

const highlight = (fullText: string, search: string) => {
  if (search !== "") {
    let text = new Option(fullText).innerHTML;
    let newText = text.replaceAll(
      new RegExp(search.replace(/[/\-\\^$*+?.()|[\]{}]/g, "\\$&"), "g"),
      `<mark>${search}</mark>`
    );
    return span({ innerHTML: newText });
  }
  return fullText;
};

export const CommitItem = (commit: Commit, search: string) =>
  div(
    { class: "commit" },
    span({ style: "font-size: 1rem" }, highlight(commit.subject, search)),
    br(),
    span(
      { style: "font-size: 0.75rem" },
      commit.author.name,
      span(
        { style: "font-weight: lighter", title: commit.author.date },
        ` commited ${timeAgo(commit.author.date)}`
      )
    )
  );
