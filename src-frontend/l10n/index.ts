import * as en from "./en.json";
import * as es from "./es.json";

const locales = {
  en,
  es,
} as const;

export const getLocale = () => {
  const locale = window.ReduxStore.getState().locales
    .locale as keyof typeof locales;
  return { locale, translations: locales[locale] };
};

export type Locale = ReturnType<typeof getLocale>;
