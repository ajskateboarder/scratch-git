export class Modal {
  /**
   * @param {string} root
   * @param {string} contents
   * @param {string} name
   */
  constructor(root, contents, name) {
    this.name = name;
    document.querySelector(root).innerHTML = contents;
  }

  /** @returns {HTMLDialogElement} */
  get modal() {
    return document.querySelector(this.name);
  }
}
