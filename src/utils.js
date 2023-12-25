// https://stackoverflow.com/a/69122877/16019146
function timeAgo(input) {
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
 * @param {any[]} list
 * @param {any} item
 * @returns {number}
 */
const count = (list, item) =>
  list.reduce(
    (count, currentValue) => count + (currentValue === item ? 1 : 0),
    0
  );

/**
 * @param {any[]} oldArray
 * @param {any[]} newArray
 * @returns {any[]}
 */
function merge(oldArray, newArray) {
  const mergedArray = [...oldArray];

  for (const newItem of newArray) {
    if (!mergedArray.includes(newItem)) {
      mergedArray.push(newItem);
    }
  }

  return mergedArray;
}

/**
 * @param {any[]} oldArray
 * @param {any[]} newArray
 * @returns {any[]}
 */
function diff(oldArray, newArray) {
  const dp = new Array(oldArray.length + 1)
    .fill(null)
    .map(() => new Array(newArray.length + 1).fill(0));
  for (let i = 1; i <= oldArray.length; i++) {
    for (let j = 1; j <= newArray.length; j++) {
      if (oldArray[i - 1] === newArray[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  /** @type {{added: string[]; removed: string[]; modified: string[]}} */
  const changes = {
    added: [],
    removed: [],
    modified: [],
  };
  let i = oldArray.length;
  let j = newArray.length;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldArray[i - 1] === newArray[j - 1]) {
      i--;
      j--;
    } else if (j === 0 || (i > 0 && dp[i][j] === dp[i - 1][j])) {
      changes.removed.push(oldArray[i - 1]);
      i--;
    } else if (i === 0 || (j > 0 && dp[i][j] === dp[i][j - 1])) {
      changes.added.push(newArray[j - 1]);
      j--;
    } else {
      changes.modified.push({
        from: oldArray[i - 1],
        to: newArray[j - 1],
      });
      i--;
      j--;
    }
  }
  changes.added.reverse();
  changes.removed.reverse();
  return changes;
}

const html = (strings, ...values) => {
  let result = strings[0];
  values.forEach((e, i) => {
    result += e + strings[i + 1];
  });
  return result;
};

export { diff, merge, count, timeAgo, html };
