import van from "vanjs-core";

const { canvas } = van.tags;

const MIMETYPE_EXT = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  svg: "image/svg+xml",
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
};

export const toDataURI = (ext: string, content: string) =>
  `data:${MIMETYPE_EXT[ext as keyof typeof MIMETYPE_EXT]};base64,${btoa(
    content
  )}`;

export const imageLayer = (image: HTMLImageElement, color: string) => {
  const tintedImage = canvas({
    width: image.width,
    height: image.height,
  });
  const ctx = tintedImage.getContext("2d")!;
  ctx.drawImage(image, 0, 0, image.width, image.height);
  ctx.globalAlpha = 0.5;
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, tintedImage.width, tintedImage.height);
  return tintedImage;
};

export const unifiedDiff = (
  previous: HTMLCanvasElement,
  current: HTMLCanvasElement
) => {
  const imageDiff = canvas({
    width: Math.max(previous.width, current.width),
    height: Math.max(previous.height, current.height),
    class: "costume-diff-canvas",
  });
  const ctx = imageDiff.getContext("2d")!;

  ctx.drawImage(
    previous,
    (imageDiff.width - previous.width) / 2,
    (imageDiff.height - previous.height) / 2
  );
  ctx.drawImage(
    current,
    (imageDiff.width - current.width) / 2,
    (imageDiff.height - current.height) / 2
  );

  return imageDiff;
};
