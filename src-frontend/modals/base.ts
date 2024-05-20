export abstract class Modal extends HTMLDialogElement {
  constructor() {
    super();
  }

  abstract display(...args: any[]): void;
  abstract refresh(): void;
}
