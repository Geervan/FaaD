import Link from 'next/link';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';

export const revalidate = 0; // Dynamic route

export default async function HomePage() {
  await FigmaStore.ensureHydrated(true);
  const session = await getSessionUser();

  const communities = FigmaStore.getCommunities().map((c) => {
    const posts = FigmaStore.getPostsByCommunity(c.id);
    const members = FigmaStore.getCommunityMemberships(c.id);

    return {
      ...c,
      postCount: posts.length,
      memberCount: members.length,
      lastActivity: posts.reduce((max, p) => (p.createdAt > max ? p.createdAt : max), c.createdAt),
    };
  });

  const recentPosts = FigmaStore.getPosts().slice(0, 10).map((p) => {
    const author = FigmaStore.getUserById(p.authorId);
    const community = FigmaStore.getCommunityById(p.communityId);
    const comments = FigmaStore.getCommentsByPost(p.id);
    const voteTally = FigmaStore.getVoteTally(p.id);

    let lastActivity = p.createdAt;
    for (const cmt of comments) {
      if (cmt.createdAt > lastActivity) lastActivity = cmt.createdAt;
    }

    return {
      ...p,
      authorName: author ? author.username : 'Unknown',
      communitySlug: community ? community.slug : '',
      communityName: community ? community.name : 'Unknown',
      commentCount: comments.length,
      voteScore: voteTally.score,
      lastActivity,
    };
  });

  const formatDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div>
      {/* Breadcrumbs & Header Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div className="forum-breadcrumbs" style={{ margin: 0 }}>
          <span>Forum Index</span>
        </div>
        {session && (
          <Link href="/communities/new" className="btn btn-primary btn-sm">
            + Create Community
          </Link>
        )}
      </div>

      {/* Community Directory Section */}
      <div style={{ marginBottom: '28px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: '#121416' }}>
          Available Communities
        </h2>

        {communities.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '24px', textAlign: 'center', borderRadius: '3px', background: '#f8f9fa' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>No communities have been created yet.</p>
            <p style={{ color: '#5c6370', fontSize: '13px', marginBottom: '12px' }}>
              Be the first community owner to establish a discussion forum!
            </p>
            {session ? (
              <Link href="/communities/new" className="btn btn-primary btn-sm">
                Create First Community
              </Link>
            ) : (
              <Link href="/register" className="btn btn-primary btn-sm">
                Register to Create Community
              </Link>
            )}
          </div>
        ) : (
          <div className="forum-table-wrapper">
            <table className="forum-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Community & Description</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Posts</th>
                  <th style={{ width: '15%', textAlign: 'center' }}>Members</th>
                  <th style={{ width: '20%', textAlign: 'right' }}>Last Activity</th>
                </tr>
              </thead>
              <tbody>
                {communities.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                        <Link href={`/c/${c.slug}`} style={{ fontWeight: '700', fontSize: '14px' }}>
                          {c.name}
                        </Link>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>/c/{c.slug}</span>
                      </div>
                      <div style={{ fontSize: '12px', color: '#495057', marginTop: '2px' }}>{c.description}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{c.postCount}</td>
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{c.memberCount}</td>
                    <td style={{ textAlign: 'right', color: '#5c6370', fontSize: '12px' }} suppressHydrationWarning>
                      {formatDate(c.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Discussions Section */}
      <div>
        <h2 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '8px', color: '#121416' }}>
          Recent Discussions Across Forum
        </h2>

        {recentPosts.length === 0 ? (
          <div style={{ border: '1px solid #dee2e6', padding: '20px', textAlign: 'center', borderRadius: '3px', color: '#5c6370' }}>
            No recent discussions to display.
          </div>
        ) : (
          <div className="forum-table-wrapper">
            <table className="forum-table">
              <thead>
                <tr>
                  <th style={{ width: '50%' }}>Topic Title</th>
                  <th style={{ width: '18%' }}>Community</th>
                  <th style={{ width: '12%' }}>Author</th>
                  <th style={{ width: '8%', textAlign: 'center' }}>Replies</th>
                  <th style={{ width: '12%', textAlign: 'right' }}>Activity</th>
                </tr>
              </thead>
              <tbody>
                {recentPosts.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <Link href={`/c/${p.communitySlug}/posts/${p.id}`} style={{ fontWeight: '600' }}>
                        {p.type === 'image' && <span style={{ fontSize: '11px', color: '#0055cc', marginRight: '4px' }}>[IMG]</span>}
                        {p.title}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/c/${p.communitySlug}`} style={{ fontSize: '12px' }}>
                        /c/{p.communitySlug}
                      </Link>
                    </td>
                    <td>
                      <Link href={`/u/${p.authorName}`} style={{ fontSize: '12px' }}>
                        {p.authorName}
                      </Link>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: '600' }}>{p.commentCount}</td>
                    <td style={{ textAlign: 'right', color: '#5c6370', fontSize: '12px' }} suppressHydrationWarning>
                      {formatDate(p.lastActivity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
