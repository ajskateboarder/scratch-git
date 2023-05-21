// https://stackoverflow.com/a/61511955/16019146
function waitForElm(selector) {
  return new Promise((resolve) => {
    if (document.querySelector(selector)) {
      return resolve(document.querySelector(selector));
    }

    const observer = new MutationObserver((_) => {
      if (document.querySelector(selector)) {
        resolve(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });
}

function waitForSave() {
  waitForElm(".save-status_save-now_xBhky").then((element) => {
    element.onclick = () => {
      alert("12");
    };
  });
}

console.log("You have successfully installed scratch.git\nRun wild ;)");
waitForElm(
  "#app > div > div.gui_menu-bar-position_RwwFc.menu-bar_menu-bar_48TYq.box_box_-Ky8F > div.menu-bar_main-menu_ZLuRH > div.menu-bar_file-group_ygFQx > div.menu-bar_menu-bar-item_hHpQG.menu-bar_hoverable_Y5GVe.menu-bar_active_5wZbh > div > ul > li:nth-child(3)"
).then((element) => {
  element.onclick = () => {
    setTimeout(() => {
      waitForElm(".save-status_save-now_xBhky").then((element) => {
        element.onclick = () => {
          alert("12");
        };
      });
    }, 2000);
  };
});

waitForSave();
