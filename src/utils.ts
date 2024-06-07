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
        alert(e)
        workingProxy = (url: string) =>
          `https://universal-cors-proxy.glitch.me/${encodeURIComponent(url)}`;
      });
  });

export const wrapProxy = (url: string) => {
  alert(workingProxy(url))
  return workingProxy(url)
};

export const assert = (condition: boolean, message: string) => {
  if (!condition) throw Error(message);
};
