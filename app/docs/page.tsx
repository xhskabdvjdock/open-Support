"use client";

import Link from "next/link";
import { useLocale } from "@/lib/useLocale";
import LanguageToggle from "@/components/LanguageToggle";

export default function DocsPage() {
  const { locale, toggleLocale, t, ready } = useLocale();
  if (!ready) return null;

  return (
    <main className="docs-page">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <Link href="/" className="docs-back" style={{ marginBottom: 0 }}>
          {t.docsPage.back}
        </Link>
        <LanguageToggle locale={locale} t={t} onToggle={toggleLocale} />
      </div>
      <h1>{t.docsPage.title}</h1>
      <p>{t.docsPage.intro}</p>

      <h2>{t.docsPage.howTitle}</h2>
      <p>{t.docsPage.howBody}</p>

      <h2>{t.docsPage.privacyTitle}</h2>
      <p>{t.docsPage.privacyBody}</p>

      <h2>{t.docsPage.visionTitle}</h2>
      <p>{t.docsPage.visionBody}</p>

      <h2>{t.docsPage.frameTitle}</h2>
      <p>{t.docsPage.frameBody}</p>

      <h2>{t.docsPage.contextTitle}</h2>
      <p>{t.docsPage.contextBody}</p>

      <h2>{t.docsPage.browsersTitle}</h2>
      <p>{t.docsPage.browsersBody}</p>

      <h2>{t.docsPage.limitsTitle}</h2>
      <ul>
        <li>{t.docsPage.limit1}</li>
        <li>{t.docsPage.limit2}</li>
        <li>{t.docsPage.limit3}</li>
      </ul>
    </main>
  );
}
