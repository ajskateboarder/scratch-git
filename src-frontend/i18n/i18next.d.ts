import i18next from "i18next";
import en from "./en.json";

type Language = "pl" | "en";

type _TranslationKeys<T, Cache extends string = ""> = T extends PropertyKey
  ? Cache
  : keyof T extends Language
  ? Cache
  : {
      [P in keyof T]: P extends string
        ? Cache extends ""
          ? _TranslationKeys<T[P], `${P}`>
          : Cache | _TranslationKeys<T[P], `${Cache}.${P}`>
        : never;
    }[keyof T];

export type t = <K extends _TranslationKeys<typeof en>>(k: K) => string;
