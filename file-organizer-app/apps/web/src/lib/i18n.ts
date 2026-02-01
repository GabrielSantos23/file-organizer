import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, defaultLanguage } from "@/locales";

const getInitialLanguage = (): string => {
  const stored = localStorage.getItem("file-organizer-language");
  if (stored && Object.keys(resources).includes(stored)) {
    return stored;
  }

  const browserLang = navigator.language;
  if (Object.keys(resources).includes(browserLang)) {
    return browserLang;
  }

  const shortLang = browserLang.split("-")[0];
  const match = Object.keys(resources).find((lang) =>
    lang.startsWith(shortLang),
  );
  if (match) {
    return match;
  }

  return defaultLanguage;
};

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  debug: process.env.NODE_ENV === "development",

  interpolation: {
    escapeValue: false,
  },

  react: {
    useSuspense: false,
  },
});
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("file-organizer-language", lng);
  document.documentElement.lang = lng;
});

export default i18n;
