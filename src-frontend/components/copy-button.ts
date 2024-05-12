import van from "vanjs-core";

const { button, canvas, i } = van.tags;

async function copySVG(svgElement: SVGElement) {
  if (!svgElement.hasAttribute("xmlns")) {
    svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  }
  if (!svgElement.querySelector("style")) {
    let head = document.head.children;
    svgElement.appendChild(head[head.length - 1]);
  }

  const image = new Image();
  image.src = "data:image/svg+xml," + encodeURIComponent(svgElement.outerHTML);

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
          if (blob) {
            resolve(blob);
          }
          canv.remove();
        }, "image/png");
      }),
    }),
  ]);
}

const copyToClipboard = async (node: string | SVGElement) =>
  node instanceof SVGElement
    ? copySVG(node)
    : navigator.clipboard.writeText(node);

export const Copy = (cb: () => string | SVGElement) => {
  const copyButton = button(
    {
      class: "copy-button",
      onclick: async () => {
        console.log(cb, cb());
        copyToClipboard(cb())
          .then(() => {
            copyButton.innerHTML = '<i class="fa-solid fa-check"></i>';
            setTimeout(() => {
              copyButton.innerHTML = '<i class="fa-solid fa-copy"></i>';
            }, 1500);
            console.log("bruh");
          })
          .catch(() => {
            console.warn("failed to copy to clipboard");
          });
      },
    },
    i({ class: "fa-solid fa-copy" })
  );
  return copyButton;
};
