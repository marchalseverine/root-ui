import Link from 'next/link';
import { LanguageToggle } from './LanguageToggle';

export interface TopNavProps {
  /** Signed-in user's email, shown in the user-menu placeholder. */
  email?: string;
}

export function TopNav({ email }: TopNavProps) {
  return (
    <header className="flex items-center justify-between border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-8">
        <Link
          href="/dashboard"
          className="font-heading text-xl font-bold text-white"
        >
          root_
        </Link>
        <nav className="flex items-center gap-4 font-body text-sm">
          <Link href="/dashboard" className="text-gray-400 hover:text-white">
            Dashboard
          </Link>
          <Link href="/metrics" className="text-gray-400 hover:text-white">
            Metrics
          </Link>
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <LanguageToggle />
        {/* user-menu placeholder */}
        <span className="font-mono text-xs text-gray-400" title="Signed in">
          {email || '—'}
        </span>
      </div>
    </header>
  );
}
