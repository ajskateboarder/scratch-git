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

const workingProxy = await fetch("https://api.codetabs.com")
  .then(() => {
    return (url: string) =>
      `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`;
  })
  .catch(async () => {
    return fetch("https://universal-cors-proxy.glitch.me")
      .then(() => {
        return (url: string) =>
          `https://universal-cors-proxy.glitch.me/${encodeURIComponent(url)}`;
      })
      .catch(() => {
        throw Error("No proxy works");
      });
  });

export const wrapProxy = (url: string) => workingProxy(url);

export const assert = (condition: boolean, message: string) => {
  if (!condition) throw Error(message);
};
