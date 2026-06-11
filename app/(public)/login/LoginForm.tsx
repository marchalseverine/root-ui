'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/browser';
import { Button, Input } from '@/components/ui';

export function LoginForm() {
  const t = useTranslations('auth.login');
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (signInError) {
      setError(signInError.message);
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex w-full max-w-sm flex-col gap-5"
    >
      <h1 className="font-heading text-3xl font-bold text-white">root_</h1>

      <Input
        label={t('emailLabel')}
        name="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Input
        label={t('passwordLabel')}
        name="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      {error && (
        <p role="alert" className="font-body text-sm text-error">
          {error}
        </p>
      )}

      <Button type="submit" disabled={loading} className="w-full">
        {t('submit')}
      </Button>

      <a
        href="#"
        className="font-body text-xs text-gray-400 hover:text-coral"
      >
        {t('forgotPassword')}
      </a>
    </form>
  );
}
