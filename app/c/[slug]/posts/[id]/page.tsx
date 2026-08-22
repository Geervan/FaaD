import Link from 'next/link';
import { notFound } from 'next/navigation';
import { FigmaStore } from '@/lib/figmaStore';
import { getSessionUser } from '@/lib/auth';
import VoteButton from '@/components/VoteButton';
import CommentForm from '@/components/CommentForm';
import DeleteActionButton from '@/components/DeleteActionButton';
import EditPostButton from '@/components/EditPostButton';
import BackButton from '@/components/BackButton';
import FormattedText from '@/components/FormattedText';
import ThreadedCommentTree, { SerializedCommentNode } from '@/components/ThreadedCommentTree';

export const revalidate = 0;

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  await FigmaStore.ensureHydrated(true);
  const { slug, id } = await params;

  const post = FigmaStore.getPostById(id);
  const community = FigmaStore.getCommunityBySlug(slug);

  if (!post || !community || post.communityId !== community.id) {
    notFound();
  }

  const session = await getSessionUser();
  const author = FigmaStore.getUserById(post.authorId);
  const rawComments = FigmaStore.getCommentsByPost(post.id);
  const voteTally = FigmaStore.getVoteTally(post.id);
  const userVote = session ? FigmaStore.getUserVote(post.id, session.id) : 0;

  const userMembership = session ? FigmaStore.getMembership(community.id, session.id) : null;
  const isOwner = session ? community.ownerId === session.id : false;
  const isMod = Boolean(userMembership && (userMembership.role === 'MODERATOR' || userMembership.role === 'OWNER'));
  const isAuthor = session ? post.authorId === session.id : false;

  const authorMembership = FigmaStore.getMembership(community.id, post.authorId);
  let authorRole = authorMembership ? authorMembership.role : 'MEMBER';
  if (community.ownerId === post.authorId) authorRole = 'OWNER';

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Build recursive comment tree
  function buildCommentTree(parentId: string | null = null): SerializedCommentNode[] {
    return rawComments
      .filter((c) => c.parentCommentId === parentId)
      .map((c) => {
        const cmtAuthor = FigmaStore.getUserById(c.authorId);
        const cmtVoteTally = FigmaStore.getVoteTally(c.id);
        const cmtUserVote = session ? FigmaStore.getUserVote(c.id, session.id) : 0;
        const cmtMembership = community ? FigmaStore.getMembership(community.id, c.authorId) : null;

        let cmtRole = cmtMembership ? cmtMembership.role : 'MEMBER';
        if (community && community.ownerId === c.authorId) cmtRole = 'OWNER';

        const canDelete = Boolean(session && (c.authorId === session.id || isOwner || isMod));
        const canEdit = Boolean(session && c.authorId === session.id);

        return {
          id: c.id,
          postId: c.postId,
          authorId: c.authorId,
          authorUsername: cmtAuthor ? cmtAuthor.username : 'Unknown',
          authorAvatarUrl: cmtAuthor?.avatarUrl,
          authorRole: cmtRole,
          parentCommentId: c.parentCommentId,
          content: c.content,
          createdAt: c.createdAt,
          voteScore: cmtVoteTally.score,
          userVote: cmtUserVote,
          canDelete,
          canEdit,
          children: buildCommentTree(c.id),
        };
      });
  }

  const commentTree = buildCommentTree(null);

  return (
    <div>
      {/* Breadcrumbs & Back Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
        <div className="forum-breadcrumbs" style={{ margin: 0 }}>
          <Link href="/">Forum Index</Link> &gt; <Link href={`/c/${community.slug}`}>/c/{community.slug}</Link> &gt;{' '}
          <span>{post.title}</span>
        </div>
        <BackButton fallbackUrl={`/c/${community.slug}`} label={`Back to /c/${community.slug}`} />
      </div>

      {/* Thread Main Header */}
      <div style={{ marginBottom: '16px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#0f172a', marginBottom: '4px' }}>{post.title}</h1>
        <div style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>
            Posted in{' '}
            <Link href={`/c/${community.slug}`} style={{ fontWeight: '600' }}>
              /c/{community.slug}
            </Link>
          </span>
          <span>&bull;</span>
          <span>{formatDate(post.createdAt)}</span>
        </div>
      </div>

      {/* Original Post (OP) Hero Card */}
      <div className="thread-post">
        {/* Left Author Box */}
        <div className="thread-author-box">
          <div className="thread-author-name">
            <Link href={`/u/${author?.username || 'unknown'}`}>@{author?.username || 'Unknown'}</Link>
          </div>
          <img
            src={author?.avatarUrl || 'https://api.dicebear.com/7.x/identicon/svg?seed=user'}
            alt="Avatar"
            className="thread-author-avatar"
          />
          <div style={{ marginTop: '4px' }}>
            <span className={`role-badge role-badge-${authorRole.toLowerCase()}`}>{authorRole}</span>
          </div>
          <div style={{ marginTop: '8px', color: '#64748b', fontSize: '11px' }}>
            Joined: {author ? new Date(author.createdAt).toLocaleDateString() : 'N/A'}
          </div>
        </div>

        {/* Right Content Box */}
        <div className="thread-content-box">
          <div>
            <div className="thread-post-header">
              <span>Original Post</span>
              <span>#1 (OP)</span>
            </div>

            <div className="thread-post-body">
              <FormattedText content={post.content} />
            </div>

            {post.type === 'image' && post.imageUrl && (
              <div style={{ marginTop: '12px' }}>
                <img src={post.imageUrl} alt={post.title} className="thread-post-image" />
              </div>
            )}
          </div>

          <div className="thread-post-footer">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {isAuthor && (
                <EditPostButton postId={post.id} initialTitle={post.title} initialContent={post.content} />
              )}
              {(isAuthor || isOwner || isMod) && (
                <DeleteActionButton type="post" id={post.id} redirectUrl={`/c/${community.slug}`} />
              )}
            </div>

            <VoteButton
              targetId={post.id}
              initialScore={voteTally.score}
              initialUserVote={userVote}
              isLoggedIn={Boolean(session)}
            />
          </div>
        </div>
      </div>

      {/* Replies Thread Section */}
      <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#0f172a', margin: '24px 0 12px 0' }}>
        Replies ({rawComments.length})
      </h3>

      <ThreadedCommentTree nodes={commentTree} postId={post.id} isLoggedIn={Boolean(session)} communitySlug={community.slug} />

      {/* Quick Reply Form for OP */}
      <div style={{ marginTop: '28px', border: '1px solid #cbd5e1', borderRadius: '3px', padding: '16px', background: '#f8fafc' }}>
        <h4 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '8px', color: '#0f172a' }}>Post a Top-Level Reply</h4>
        <CommentForm postId={post.id} isLoggedIn={Boolean(session)} />
      </div>
    </div>
  );
}
