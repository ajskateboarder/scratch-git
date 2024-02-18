// https://stackoverflow.com/a/69122877/16019146
export function timeAgo(input) {
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
  for (let key in ranges) {
    if (ranges[key] < Math.abs(secondsElapsed)) {
      const delta = secondsElapsed / ranges[key];
      return formatter.format(Math.round(delta), key);
    }
  }
}

/**
 * @param {string} oldContent
 * @param {string} newContent
 * @returns {Promise<{added: number; removed: number; diffed: string}>}
 */
export async function diff(oldContent, newContent) {
  return await (
    await fetch("http://localhost:8000/diff", {
      method: "POST",
      body: JSON.stringify({
        old_content: oldContent,
        new_content: newContent,
      }),
      headers: {
        "Content-type": "application/json; charset=UTF-8",
      },
    })
  ).json();
}

export function html(strings, ...values) {
  let result = strings[0];
  values.forEach((e, i) => {
    result += e + strings[i + 1];
  });
  return result;
}
