'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { SessionUser } from '@/lib/types';

export default function NavbarAuth({ session }: { session: SessionUser | null }) {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  };

  if (session) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span>
          Logged in as:{' '}
          <Link href={`/u/${session.username}`} style={{ fontWeight: '600' }}>
            {session.username}
          </Link>
        </span>
        <button onClick={handleLogout} className="btn btn-secondary btn-sm">
          Log Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <Link href="/login" className="btn btn-secondary btn-sm">
        Log In
      </Link>
      <Link href="/register" className="btn btn-primary btn-sm">
        Register
      </Link>
    </div>
  );
}
