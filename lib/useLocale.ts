"use client";

import { useCallback, useEffect, useState } from "react";
import {
  applyLocaleToDocument,
  detectLocale,
  getStrings,
  persistLocale,
  type Locale,
  type Strings,
} from "./i18n";

export function useLocale() {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const initial = detectLocale();
    // Sync persisted/browser locale after mount (client-only APIs).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocaleState(initial);
    applyLocaleToDocument(initial);
    setReady(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    persistLocale(next);
    applyLocaleToDocument(next);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((prev) => {
      const next: Locale = prev === "ar" ? "en" : "ar";
      persistLocale(next);
      applyLocaleToDocument(next);
      return next;
    });
  }, []);

  const t: Strings = getStrings(locale);

  return { locale, setLocale, toggleLocale, t, ready };
}
