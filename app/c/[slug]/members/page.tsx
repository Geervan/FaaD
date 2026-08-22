import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FigmaStore } from '@/lib/figmaStore';

export const revalidate = 0;

export default async function CommunityMembersPage({ params }: { params: Promise<{ slug: string }> }) {
  await FigmaStore.ensureHydrated();
  const { slug } = await params;
  const community = FigmaStore.getCommunityBySlug(slug);

  if (!community) {
    notFound();
  }

  const memberships = FigmaStore.getCommunityMemberships(community.id);

  const memberDetails = memberships
    .map((m) => {
      const u = FigmaStore.getUserById(m.userId);
      if (!u) return null;
      return {
        id: u.id,
        username: u.username,
        avatarUrl: u.avatarUrl,
        bio: u.bio,
        role: m.role,
        joinedAt: m.joinedAt,
      };
    })
    .filter(Boolean);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Recent';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="forum-breadcrumbs">
        <Link href="/">Forum Index</Link> &gt; <Link href={`/c/${community.slug}`}>/c/{community.slug}</Link> &gt; <span>Members</span>
      </div>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a' }}>
            /c/{community.slug} &ndash; Members ({memberDetails.length})
          </h1>
          <p style={{ fontSize: '13px', color: '#475569', marginTop: '2px' }}>
            Registered community members and leadership roster for <strong>{community.name}</strong>.
          </p>
        </div>
        <Link href={`/c/${community.slug}`} className="btn btn-secondary btn-sm">
          &larr; Back to Topics
        </Link>
      </div>

      {/* Members Directory Table */}
      <table className="forum-table">
        <thead>
          <tr>
            <th style={{ width: '35%' }}>Member</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Role</th>
            <th style={{ width: '35%' }}>Bio / Status</th>
            <th style={{ width: '15%', textAlign: 'right' }}>Joined</th>
          </tr>
        </thead>
        <tbody>
          {memberDetails.map((m) => (
            <tr key={m!.id}>
              <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <img
                    src={m!.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m!.username}`}
                    alt={m!.username}
                    style={{ width: '32px', height: '32px', borderRadius: '3px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff' }}
                  />
                  <div>
                    <Link href={`/u/${m!.username}`} style={{ fontWeight: '700', fontSize: '14px' }}>
                      @{m!.username}
                    </Link>
                  </div>
                </div>
              </td>
              <td style={{ textAlign: 'center' }}>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '2px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    backgroundColor: m!.role === 'OWNER' ? '#fffbea' : m!.role === 'MODERATOR' ? '#ebf8ff' : '#f1f5f9',
                    color: m!.role === 'OWNER' ? '#b7791f' : m!.role === 'MODERATOR' ? '#2b6cb0' : '#475569',
                    border: `1px solid ${m!.role === 'OWNER' ? '#f6e05e' : m!.role === 'MODERATOR' ? '#90cdf4' : '#cbd5e1'}`,
                  }}
                >
                  {m!.role}
                </span>
              </td>
              <td style={{ fontSize: '13px', color: '#475569' }}>
                {m!.bio || <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>No bio provided</span>}
              </td>
              <td style={{ textAlign: 'right', fontSize: '12px', color: '#64748b' }}>{formatDate(m!.joinedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
