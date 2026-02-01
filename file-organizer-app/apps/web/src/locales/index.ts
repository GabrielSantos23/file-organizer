import en from "./en.json";
import ptBR from "./pt-BR.json";
import es from "./es.json";

export const resources = {
  en: {
    translation: en,
  },
  "pt-BR": {
    translation: ptBR,
  },
  es: {
    translation: es,
  },
} as const;

export type Language = keyof typeof resources;

export const languages: { code: Language; name: string; nativeName: string }[] =
  [
    { code: "en", name: "English", nativeName: "English" },
    {
      code: "pt-BR",
      name: "Portuguese (Brazil)",
      nativeName: "Português (Brasil)",
    },
    { code: "es", name: "Spanish", nativeName: "Español" },
  ];

export const defaultLanguage: Language = "pt-BR";
