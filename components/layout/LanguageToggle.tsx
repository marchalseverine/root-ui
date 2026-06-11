export const LOCALES = ['en', 'fr', 'es'] as const;
export type Locale = (typeof LOCALES)[number];

export interface LanguageToggleProps {
  /** Currently active locale (visual only for now). */
  locale?: Locale;
}

/**
 * Static EN/FR/ES pills. Renders only — wiring (locale switch + persistence)
 * lands in T10.
 */
export function LanguageToggle({ locale = 'en' }: LanguageToggleProps) {
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
          className={`rounded-sm px-2 py-1 font-body text-xs font-semibold uppercase tracking-wide transition-colors ${
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
