"use client";

import { Languages } from "lucide-react";
import type { Locale, Strings } from "@/lib/i18n";

interface Props {
  locale: Locale;
  t: Strings;
  onToggle: () => void;
  compact?: boolean;
}

/**
 * Language switcher — icon (lucide `Languages`) + text label, never emoji.
 * Shows the *other* language so the user knows what they switch to.
 */
export default function LanguageToggle({ locale, t, onToggle, compact }: Props) {
  const isArabic = locale === "ar";
  const label = isArabic ? t.languageToggleToEnglish : t.languageToggleToArabic;
  const shortLabel = isArabic ? t.languageShortEn : t.languageShortAr;

  return (
    <button
      type="button"
      className="lang-toggle"
      onClick={onToggle}
      aria-label={label}
      title={label}
    >
      <Languages size={15} aria-hidden="true" />
      {!compact && <span>{shortLabel}</span>}
      {compact && <span className="hide-sm">{shortLabel}</span>}
    </button>
  );
}
