'use client';

import { useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export type Locale = 'en' | 'fr' | 'es';

const ONE_YEAR = 60 * 60 * 24 * 365;

/**
 * Locale state + switcher. `changeLanguage` persists the choice in a
 * JS-readable cookie (consumed by next-intl server-side), localStorage, and the
 * user's profile, then refreshes server components so the UI re-renders in the
 * new language.
 */
export function useI18n() {
  const locale = useLocale() as Locale;
  const t = useTranslations();
  const router = useRouter();

  const changeLanguage = useCallback(
    async (lang: Locale) => {
      // (1) cookie read by next-intl on the server
      document.cookie = `ui_language=${lang}; path=/; max-age=${ONE_YEAR}; samesite=lax`;
      // (2) localStorage
      try {
        localStorage.setItem('ui_language', lang);
      } catch {
        // storage unavailable (private mode) — non-fatal
      }
      // (3) persist to profile (best-effort)
      try {
        await fetch('/api/profile', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ui_language: lang }),
        });
      } catch {
        // offline / unauthenticated — cookie still drives the UI
      }
      // re-render server components with the new locale
      router.refresh();
    },
    [router]
  );

  return { locale, changeLanguage, t };
}
