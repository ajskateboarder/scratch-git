import van, { Props } from "vanjs-core";

const { button, canvas, i, a } = van.tags;

/** Convert image to a PNG if needed and copy it to the user's clipboard */
const copyImage = async (target: SVGElement | HTMLImageElement) => {
  if (!target.hasAttribute("xmlns")) {
    target.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!target.querySelector("style")) {
    const head = document.head.children;
    target.appendChild(head[head.length - 1]);
  }

  const image =
    target instanceof SVGElement
      ? Object.assign(new Image(), {
          src: "data:image/svg+xml," + encodeURIComponent(target.outerHTML),
        })
      : target;

  await navigator.clipboard.write([
    new ClipboardItem({
      "image/png": new Promise((resolve) => {
        const canv = canvas({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });

        const context = canv.getContext("2d");
        context?.drawImage(image, 0, 0);

        canv.toBlob((blob) => {
          blob && resolve(blob);
          canv.remove();
        }, "image/png");
      }),
    }),
  ]);
};

const downloadImage = (node: SVGElement | HTMLImageElement) => {
  // TODO: use more descriptive file names
  if (node instanceof SVGElement) {
    // this is entirely reliant on turbowarp styles, so likely to change
    node.prepend(document.head.querySelector("style:last-child")!);
    const [contents, mime] = [node.outerHTML, "image/svg+xml"];
    const blob = new Blob([contents], { type: mime });

    a({
      href: URL.createObjectURL(blob),
      download: "diff.svg",
    }).click();
  } else {
    // html images are expected to use a data url here
    a({
      href: node.src,
      download: `image.${node.src.split(";")[0].split("/")[1]}`,
    }).click();
  }
};

/** Copy scratchblocks code, an image, or a script SVG to the clipboard */
const copyToClipboard = async (node: string | SVGElement | HTMLImageElement) =>
  typeof node === "string"
    ? navigator.clipboard.writeText(node)
    : copyImage(node);

export const Copy = (
  cb: () => string | SVGElement | HTMLImageElement,
  props: Props = {}
) => {
  const copyButton = button(
    {
      class: "copy-button",
      title: "Click while holding Shift to download image.",
      ...props,
      onclick: async (e: KeyboardEvent) => {
        const node = cb();
        if (e.shiftKey && typeof node !== "string") {
          downloadImage(node);
        } else {
          copyToClipboard(node).catch(() => {
            console.warn("failed to copy to clipboard");
          });
        }
        copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
        setTimeout(() => {
          copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
        }, 1500);
      },
    },
    i({ class: "fa-solid fa-copy" })
  );
  return copyButton;
};
