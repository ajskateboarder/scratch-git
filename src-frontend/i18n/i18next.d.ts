import i18next from "i18next";
import en from "./en.json";

type SupportedLangs = "en" | "es" | "de";

type _TranslationKeys<T, Cache extends string = ""> = T extends PropertyKey
  ? Cache
  : keyof T extends SupportedLangs
  ? Cache
  : {
      [P in keyof T]: P extends string
        ? Cache extends ""
          ? _TranslationKeys<T[P], `${P}`>
          : Cache | _TranslationKeys<T[P], `${Cache}.${P}`>
        : never;
    }[keyof T];

export type Translation = <K extends _TranslationKeys<typeof en>>(
  k: K,
  ...any
) => string;
