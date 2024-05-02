interface Extras<T> {
  subscribe(attr: keyof T, callback: () => void): void;
}

interface WCEvents<T, E extends Element> {
  connectedCallback?: ({
    self,
    root,
  }: {
    self: T & E & Extras<T>;
    root: E;
  }) => any;
  disconnectedCallback?: () => any;
}

type FunctionOrProp<T, E extends Element> = {
  [P in keyof T]: T[P] extends (...args: any) => any
    ? ({ self, root }: { self: T & E & Extras<T>; root: E }) => ReturnType<T[P]>
    : T[P];
};

type Props<T, E extends Element> = FunctionOrProp<T, E> & WCEvents<T, E>;

export const wc = <T, E extends Element = HTMLElement>(
  base: { new (): E },
  root: string,
  props: Props<T, E>
) => {
  // @ts-ignore
  let A = class extends base {
    constructor(..._: any[]) {
      super();
    }
    subscribe(attr: keyof Props<T, E>, callback: () => void) {
      if (typeof attr === "function") return;
      Object.defineProperty(this, attr, {
        get: () => {
          return props[attr];
        },
        set: (value: any) => {
          // @ts-ignore
          if (this[attr] !== value) {
            props[attr] = value;
            callback();
          }
        },
      });
    }
  };
  Object.keys(props as {}).forEach((key) => {
    Object.defineProperty(A.prototype, key, {
      get() {
        if (typeof props[key as keyof Props<T, E>] !== "function")
          return props[key as keyof Props<T, E>];
        else
          return () =>
            (props[key as keyof Props<T, E>] as (_: any) => any)({
              self: this,
              root: document.querySelector(root),
            });
      },
      set(value) {
        props[key as keyof Props<T, E>] = value;
      },
      enumerable: true,
      configurable: true,
    });
  });
  return A;
};
