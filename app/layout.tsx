import type { Metadata } from 'next';
import './globals.css';
import Link from 'next/link';
import { getSessionUser } from '@/lib/auth';
import { FigmaStore } from '@/lib/figmaStore';
import NavbarAuth from '@/components/NavbarAuth';

export const metadata: Metadata = {
  title: 'FaaD - FigmaAsADatabase Community Forum',
  description: 'A classic 2000s internet forum using a Figma design canvas as its real-time database.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  await FigmaStore.ensureHydrated();
  const session = await getSessionUser();

  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <div className="forum-container">
          {/* Header */}
          <header className="forum-header">
            <div>
              <Link href="/" className="forum-title">
                FaaD &bull; FigmaAsADatabase
              </Link>
            </div>

            <nav className="forum-nav">
              <Link href="/">Directory</Link>
              <NavbarAuth session={session} />
            </nav>
          </header>

          {/* Main Content */}
          <main>{children}</main>

          {/* Single-Line Spreading Footer */}
          <footer className="forum-footer">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px 16px', fontSize: '12px', color: '#475569' }}>
              <div>
                <strong style={{ color: '#0f172a' }}>FaaD &bull; FigmaAsADatabase</strong>: The classic 2000s forum layout is 100% intentional and coz im lazy af.
              </div>

              <div>
                Designed & Engineered by{' '}
                <a
                  href="https://www.linkedin.com/in/geervan"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontWeight: '700', color: '#0055cc', textDecoration: 'underline' }}
                >
                  Geervan
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
