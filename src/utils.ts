export const proxy = async (url: string) => {
  const request = await fetch(
    `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
  );
  assert(request.ok, "Failed to make request to: " + url);
  return request;
};

export const assert = (condition: boolean, message: string) => {
  if (!condition) throw Error(message);
};
