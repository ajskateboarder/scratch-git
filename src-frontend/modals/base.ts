export abstract class Modal extends HTMLDialogElement {
  constructor() {
    super();
  }

  abstract connectedCallback(): void;

  public abstract display(...args: any[]): void;

  public refresh() {
    this.querySelector("main")?.remove();
    this.connectedCallback();
  }
}
