'use client';

import { useTranslations } from 'next-intl';

export function EmptyState() {
  const t = useTranslations('dashboard.empty');
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-200 p-12 text-center">
      <p className="font-heading text-lg text-white">{t('title')}</p>
      <p className="font-body text-sm text-gray-400">{t('description')}</p>
    </div>
  );
}
