import * as de from "./de.json";
import * as en from "./en.json";
import * as es from "./es.json";
import i18next from "i18next";

export const getLocale = () => window.ReduxStore.getState().locales.locale;

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
  missingKeyHandler: (_lngs: any, _ns: any, key: any) => {
    console.warn("missing language key for", _ns, key);
    return key;
  },
});

type SupportedLangs = "en" | "es" | "de";

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

export default Object.assign(i18next, {
  t: i18next.t as unknown as (
    k: _TranslationKeys<typeof en, "">,
    ...any: any[]
  ) => string,
});
