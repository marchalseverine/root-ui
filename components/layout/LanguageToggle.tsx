'use client';

import { useI18n, type Locale } from '@/hooks/useI18n';
import { useStreaming } from '@/context/StreamingContext';

export const LOCALES: readonly Locale[] = ['en', 'fr', 'es'];

/** EN/FR/ES pills wired to the locale switch. Disabled while streaming. */
export function LanguageToggle() {
  const { locale, changeLanguage } = useI18n();
  const { streamingActive } = useStreaming();

  return (
    <div
      role="group"
      aria-label="Language"
      className="flex items-center gap-0.5 rounded-md border border-gray-200 p-0.5"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          type="button"
          aria-pressed={l === locale}
          disabled={streamingActive}
          onClick={() => changeLanguage(l)}
          className={`rounded-sm px-2 py-1 font-body text-xs font-semibold uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
            l === locale
              ? 'bg-coral text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
