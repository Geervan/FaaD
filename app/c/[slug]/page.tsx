import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';
import CommunityJoinButton from '@/components/CommunityJoinButton';
import DeleteCommunityButton from '@/components/DeleteCommunityButton';
import EditCommunityButton from '@/components/EditCommunityButton';
import FeedCardItem from '@/components/FeedCardItem';
import BackButton from '@/components/BackButton';

export const revalidate = 0;

export default async function CommunityPage({ params }: { params: Promise<{ slug: string }> }) {
  await FigmaStore.ensureHydrated();
  const { slug } = await params;
  const community = FigmaStore.getCommunityBySlug(slug);

  if (!community) {
    notFound();
  }

  const session = await getSessionUser();
  const owner = FigmaStore.getUserById(community.ownerId);
  const memberships = FigmaStore.getCommunityMemberships(community.id);
  const posts = FigmaStore.getPostsByCommunity(community.id);

  const moderators = memberships
    .filter((m) => m.role === 'MODERATOR' || m.role === 'OWNER')
    .map((m) => FigmaStore.getUserById(m.userId))
    .filter(Boolean);

  const isMember = session ? memberships.some((m) => m.userId === session.id) : false;
  const isOwner = session ? community.ownerId === session.id : false;

  const topicList = posts.map((p) => {
    const author = FigmaStore.getUserById(p.authorId);
    const comments = FigmaStore.getCommentsByPost(p.id);
    const voteTally = FigmaStore.getVoteTally(p.id);
    const userVote = session ? FigmaStore.getUserVote(p.id, session.id) : 0;

    const authorMembership = FigmaStore.getMembership(community.id, p.authorId);
    let authorRole = authorMembership ? authorMembership.role : 'MEMBER';
    if (community.ownerId === p.authorId) authorRole = 'OWNER';

    let lastActivity = p.createdAt;
    for (const cmt of comments) {
      if (cmt.createdAt > lastActivity) lastActivity = cmt.createdAt;
    }

    return {
      ...p,
      authorName: author ? author.username : 'Unknown',
      authorAvatarUrl: author?.avatarUrl,
      authorRole,
      commentCount: comments.length,
      voteScore: voteTally.score,
      userVote,
      lastActivity,
    };
  });

  return (
    <div>
      {/* Breadcrumbs & Back Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="forum-breadcrumbs" style={{ margin: 0 }}>
          <Link href="/">Forum Index</Link> &gt; <span>/c/{community.slug}</span>
        </div>
        <BackButton fallbackUrl="/" label="Back to Index" />
      </div>

      {/* Community Banner & Info Card */}
      <div className="community-banner">
        <div>
          <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>
            {community.name}
          </h1>
          <p style={{ color: '#475569', fontSize: '14px', marginBottom: '12px' }}>{community.description}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', fontSize: '12px', color: '#64748b', alignItems: 'center' }}>
            <span>
              Owner:{' '}
              <Link href={`/u/${owner?.username}`} style={{ fontWeight: '600' }}>
                @{owner?.username}
              </Link>
            </span>
            <span>
              Moderators:{' '}
              {moderators.map((m, idx) => (
                <span key={m!.id}>
                  <Link href={`/u/${m!.username}`}>@{m!.username}</Link>
                  {idx < moderators.length - 1 ? ', ' : ''}
                </span>
              ))}
            </span>
            <span>
              <Link href={`/c/${community.slug}/members`} style={{ fontWeight: '600', textDecoration: 'underline' }}>
                Members: {memberships.length}
              </Link>
            </span>
          </div>
        </div>

        <div className="community-banner-actions">
          <CommunityJoinButton slug={community.slug} isMember={isMember} isOwner={isOwner} isLoggedIn={Boolean(session)} />
          {isOwner && (
            <>
              <EditCommunityButton slug={community.slug} initialName={community.name} initialDescription={community.description} />
              <Link href={`/c/${community.slug}/moderators`} className="btn btn-secondary btn-sm">
                Manage Moderators
              </Link>
              <DeleteCommunityButton slug={community.slug} name={community.name} />
            </>
          )}
        </div>
      </div>

      {/* Feed Bar Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: '700', color: '#0f172a' }}>Community Feed ({topicList.length})</h2>
        {session ? (
          <Link href={`/c/${community.slug}/new-post`} className="btn btn-primary btn-sm">
            + New Post
          </Link>
        ) : (
          <Link href="/login" className="btn btn-secondary btn-sm">
            Log in to Post
          </Link>
        )}
      </div>

      {/* Feed Cards */}
      {topicList.length === 0 ? (
        <div style={{ border: '1px solid #cbd5e1', padding: '28px', textAlign: 'center', borderRadius: '3px', color: '#64748b' }}>
          No topics have been posted in this community yet.{' '}
          {session && (
            <Link href={`/c/${community.slug}/new-post`} style={{ fontWeight: '600' }}>
              Start the first discussion!
            </Link>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {topicList.map((t) => (
            <FeedCardItem
              key={t.id}
              slug={community.slug}
              post={t}
              isLoggedIn={Boolean(session)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
