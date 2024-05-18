import i18next from "i18next";

import * as en from "./en.json";
import * as es from "./es.json";

export const getLocale = () => window.ReduxStore.getState().locales.locale;

i18next.init({
  lng: getLocale(),
  fallbackLng: "en",
  resources: {
    en: {
      translation: en,
    },
    es: {
      translation: es,
    },
  },
  missingKeyHandler: () => i18next.changeLanguage("en"),
});

export default i18next;
