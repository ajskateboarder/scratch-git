export class Base extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback(): void {}

  display(...args: any[]): void {}

  close() {
    this.style.display = "none";
  }
  showModal() {
    this.style.display = "flex";
  }
  get open() {
    return this.style.display !== "none";
  }
}
