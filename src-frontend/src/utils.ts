export const proxy = async (url: string) => {
  return fetch(
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  )
    .then((e) => {
      return e;
    })
    .catch(async () => {
      const request = await fetch(
        `https://universal-cors-proxy.glitch.me/${encodeURIComponent(url)}`
      );

      assert(request.ok, "Failed to make request to: " + url);
      return request;
    });
};

let workingProxy: (url: string) => string;

fetch("https://api.codetabs.com")
  .then(() => {
    workingProxy = (url: string) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  })
  .catch(async () => {
    return fetch("https://universal-cors-proxy.glitch.me")
      .then(() => {
        workingProxy = (url: string) =>
          `https://universal-cors-proxy.glitch.me/${encodeURIComponent(url)}`;
      })
      .catch((e) => {
        workingProxy = (url: string) =>
          `https://universal-cors-proxy.glitch.me/${encodeURIComponent(url)}`;
      });
  });

export const wrapProxy = (url: string) => {
  return workingProxy(url)
};

export const assert = (condition: boolean, message: string) => {
  if (!condition) throw Error(message);
};

export const timeAgo = (date: Date) => {
    const formatter = new Intl.RelativeTimeFormat('en');
    const ranges = [
      ['years', 3600 * 24 * 365],
      ['months', 3600 * 24 * 30],
      ['weeks', 3600 * 24 * 7],
      ['days', 3600 * 24],
      ['hours', 3600],
      ['minutes', 60],
      ['seconds', 1],
    ] as const;
    const secondsElapsed = (date.getTime() - Date.now()) / 1000;
   
    for (const [rangeType, rangeVal] of ranges) {
      if (rangeVal < Math.abs(secondsElapsed)) {
        const delta = secondsElapsed / rangeVal;
        return formatter.format(Math.round(delta), rangeType);
      }
    }
}