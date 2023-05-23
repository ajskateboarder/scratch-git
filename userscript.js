// pretend I don't exist, please
setInterval(() => {
  try {
    document.querySelector(".save-status_save-now_xBhky").onclick = () => {
      (async () => {
        const res = await fetch("http://localhost:6969/commit");
        console.log(await res.json());
      })();
    };
  } catch {}
}, 500);
