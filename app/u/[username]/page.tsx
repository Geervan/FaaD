import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export const revalidate = 0;

export default async function UserProfilePage({ params }: { params: Promise<{ username: string }> }) {
  await FigmaStore.ensureHydrated();
  const { username } = await params;
  const user = FigmaStore.getUserByUsername(username);

  if (!user) {
    notFound();
  }

  const session = await getSessionUser();
  const isSelf = session ? session.id === user.id : false;

  const posts = FigmaStore.getPostsByUser(user.id);
  const comments = FigmaStore.getCommentsByUser(user.id);
  const memberships = FigmaStore.getUserMemberships(user.id);

  const joinedCommunities = memberships.map((m) => {
    const com = FigmaStore.getCommunityById(m.communityId);
    return {
      id: m.communityId,
      slug: com ? com.slug : 'unknown',
      name: com ? com.name : 'Unknown Community',
      role: m.role,
    };
  });

  return (
    <div>
      {/* Breadcrumbs */}
      <div className="forum-breadcrumbs">
        <Link href="/">Forum Index</Link> &gt; <span>User Profile: @{user.username}</span>
      </div>

      {/* Profile Header Box */}
      <div
        style={{
          border: '1px solid #dee2e6',
          borderRadius: '3px',
          padding: '20px',
          backgroundColor: '#f8f9fa',
          display: 'flex',
          gap: '20px',
          alignItems: 'center',
          marginBottom: '24px',
        }}
      >
        <img
          src={user.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
          alt="Avatar"
          style={{ width: '72px', height: '72px', borderRadius: '3px', border: '1px solid #dee2e6', background: '#fff' }}
        />

        <div style={{ flexGrow: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#121416' }}>@{user.username}</h1>
              <p style={{ color: '#495057', fontSize: '13px', marginTop: '4px' }}>{user.bio || 'No bio provided.'}</p>
            </div>
            {isSelf && (
              <Link href="/settings/profile" className="btn btn-secondary btn-sm">
                Edit Profile
              </Link>
            )}
          </div>

          <div style={{ display: 'flex', gap: '20px', marginTop: '12px', fontSize: '12px', color: '#5c6370' }}>
            <span>Joined: {new Date(user.createdAt).toLocaleDateString()}</span>
            <span>Topics: {posts.length}</span>
            <span>Comments: {comments.length}</span>
            <span>Communities: {joinedCommunities.length}</span>
          </div>
        </div>
      </div>

      {/* User's Authored Topics */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Created Topics ({posts.length})</h2>
        {posts.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '3px', color: '#5c6370' }}>
            User has not started any topics yet.
          </div>
        ) : (
          <table className="forum-table">
            <thead>
              <tr>
                <th style={{ width: '60%' }}>Topic Title</th>
                <th style={{ width: '25%' }}>Community</th>
                <th style={{ width: '15%', textAlign: 'right' }}>Posted Date</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => {
                const com = FigmaStore.getCommunityById(p.communityId);
                return (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/c/${com?.slug}/posts/${p.id}`} style={{ fontWeight: '600' }}>
                        {p.title}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/c/${com?.slug}`}>/c/{com?.slug}</Link>
                    </td>
                    <td style={{ textAlign: 'right', color: '#5c6370', fontSize: '12px' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Joined Communities */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Joined Communities ({joinedCommunities.length})</h2>
        {joinedCommunities.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '3px', color: '#5c6370' }}>
            User is not a member of any community yet.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
            {joinedCommunities.map((c) => (
              <div key={c.id} style={{ border: '1px solid #dee2e6', borderRadius: '3px', padding: '12px', background: '#fff' }}>
                <Link href={`/c/${c.slug}`} style={{ fontWeight: '700', fontSize: '14px', display: 'block', marginBottom: '4px' }}>
                  /c/{c.slug}
                </Link>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                  <span style={{ fontSize: '12px', color: '#5c6370' }}>{c.name}</span>
                  <span className={`role-badge role-badge-${c.role.toLowerCase()}`}>{c.role}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
