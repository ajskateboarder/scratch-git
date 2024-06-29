import van from "vanjs-core";

const { button, canvas, i } = van.tags;

/** Convert an SVG element to a PNG and copy it to the user's clipboard */
const copySVG = async (svgElement: SVGElement) => {
  if (!svgElement.hasAttribute("xmlns")) {
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svgElement.querySelector("style")) {
    const head = document.head.children;
    svgElement.appendChild(head[head.length - 1]);
  }

  const image = Object.assign(new Image(), {
    src: "data:image/svg+xml," + encodeURIComponent(svgElement.outerHTML),
  });

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

/** Copy a string or an SVG element to the clipboard */
const copyToClipboard = async (node: string | SVGElement) =>
  node instanceof SVGElement
    ? copySVG(node)
    : navigator.clipboard.writeText(node);

export const Copy = (cb: () => string | SVGElement) => {
  const copyButton = button(
    {
      class: "copy-button",
      onclick: async () => {
        copyToClipboard(cb())
          .then(() => {
            copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
            }, 1500);
          })
          .catch(() => {
            console.warn("failed to copy to clipboard");
          });
      },
    },
    i({ class: "fa-solid fa-copy" }),
  );
  return copyButton;
};
