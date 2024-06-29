import { Redux } from "@/lib";
import de from "./de";
import en from "./en";
import es from "./es";
import i18next, { i18n } from "i18next";

export const getLocale = () => Redux.getState().locales.locale;

type SupportedLangs = "en" | "es" | "de";

i18next.init({
  lng: getLocale(),
  fallbackLng: "en",
  resources: {
    de: {
      translation: de,
    },
    en: {
      translation: en,
    },
    es: {
      translation: es,
    },
  },
});

// this makes i18next properly autocomplete keys
type _TranslationKeys<T, Cache extends string> = T extends PropertyKey
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

type BetterT = (k: _TranslationKeys<typeof en, "">, props?: Record<string, string>) => string;

export default Object.assign(i18next, {
  t: i18next.t as unknown as BetterT,
  // basically im lazy and want to save a few lines
  tlazy: (k: _TranslationKeys<typeof en, "">, props?: Record<string, string>) => () => i18next.t(k, props),
});
