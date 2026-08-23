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
      <div className="profile-card">
        <img
          src={user.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
          alt="Avatar"
          className="profile-avatar"
        />

        <div className="profile-details">
          <div className="profile-card-header">
            <div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#121416' }}>@{user.username}</h1>
              <p style={{ color: '#495057', fontSize: '13px', marginTop: '4px' }}>{user.bio || 'No bio provided.'}</p>
            </div>
            {isSelf && (
              <Link href="/settings/profile" className="btn btn-secondary btn-sm" style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                Edit Profile
              </Link>
            )}
          </div>

          <div className="profile-stats-row">
            <span><strong>Joined:</strong> {new Date(user.createdAt).toLocaleDateString()}</span>
            <a href="#topics-section" className="profile-stat-link">
              <strong>Topics:</strong> {posts.length}
            </a>
            <a href="#comments-section" className="profile-stat-link">
              <strong>Comments:</strong> {comments.length}
            </a>
            <a href="#communities-section" className="profile-stat-link">
              <strong>Communities:</strong> {joinedCommunities.length}
            </a>
          </div>
        </div>
      </div>

      {/* User's Authored Topics */}
      <div id="topics-section" style={{ marginBottom: '24px', scrollMarginTop: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Created Topics ({posts.length})</h2>
        {posts.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '3px', color: '#5c6370' }}>
            User has not started any topics yet.
          </div>
        ) : (
          <div className="forum-table-wrapper">
            <table className="forum-table">
              <thead>
                <tr>
                  <th style={{ width: '55%' }}>Topic Title</th>
                  <th style={{ width: '25%' }}>Community</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Posted Date</th>
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
          </div>
        )}
      </div>

      {/* User's Posted Comments */}
      <div id="comments-section" style={{ marginBottom: '24px', scrollMarginTop: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px' }}>Posted Comments ({comments.length})</h2>
        {comments.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '3px', color: '#5c6370' }}>
            User has not posted any comments yet.
          </div>
        ) : (
          <div className="forum-table-wrapper">
            <table className="forum-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Comment Snippet</th>
                  <th style={{ width: '30%' }}>Topic</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Posted Date</th>
                </tr>
              </thead>
              <tbody>
                {comments.map((c) => {
                  const post = FigmaStore.getPostById(c.postId);
                  const com = post ? FigmaStore.getCommunityById(post.communityId) : null;
                  const snippet = c.content.length > 80 ? c.content.substring(0, 80) + '...' : c.content;
                  const postUrl = post && com ? `/c/${com.slug}/posts/${post.id}` : '#';
                  return (
                    <tr key={c.id}>
                      <td>
                        <Link href={postUrl} style={{ fontWeight: '500', color: '#0f172a' }}>
                          "{snippet}"
                        </Link>
                      </td>
                      <td>
                        {post && com ? (
                          <Link href={postUrl} style={{ fontWeight: '600' }}>
                            {post.title}
                          </Link>
                        ) : (
                          'Unknown Topic'
                        )}
                      </td>
                      <td style={{ textAlign: 'right', color: '#5c6370', fontSize: '12px' }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Joined Communities */}
      <div id="communities-section" style={{ scrollMarginTop: '20px' }}>
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
