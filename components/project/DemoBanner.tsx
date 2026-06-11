'use client';

import { useTranslations } from 'next-intl';

export function DemoBanner() {
  const t = useTranslations('demo');
  return (
    <div className="sticky top-0 z-40 border-b border-coral bg-gray-100 px-6 py-2 text-center font-body text-xs uppercase tracking-wide text-coral">
      {t('banner')}
    </div>
  );
}
