'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VoteButton from './VoteButton';
import FormattedText from './FormattedText';

interface FeedCardItemProps {
  slug: string;
  post: {
    id: string;
    title: string;
    content: string;
    type: 'text' | 'image';
    imageUrl?: string;
    authorName: string;
    authorAvatarUrl?: string;
    authorRole: string;
    commentCount: number;
    voteScore: number;
    userVote: number;
    createdAt: number;
    lastActivity: number;
  };
  isLoggedIn: boolean;
}

export default function FeedCardItem({ slug, post: t, isLoggedIn }: FeedCardItemProps) {
  const router = useRouter();

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

  const handleCardClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    // Don't navigate if user clicked an interactive sub-element (buttons, specific links, vote widget)
    if (target.closest('button') || target.closest('a') || target.closest('.vote-widget')) {
      return;
    }
    router.push(`/c/${slug}/posts/${t.id}`);
  };

  return (
    <div
      onClick={handleCardClick}
      style={{
        border: '1px solid #cbd5e1',
        borderRadius: '3px',
        backgroundColor: '#ffffff',
        padding: '14px 16px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        cursor: 'pointer',
        transition: 'border-color 0.1s ease, box-shadow 0.1s ease',
      }}
      className="feed-card-item"
    >
      <div>
        {/* Meta Header */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '6px 8px', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
          <img
            src={t.authorAvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${t.authorName}`}
            alt={t.authorName}
            style={{ width: '22px', height: '22px', borderRadius: '2px', border: '1px solid #cbd5e1' }}
          />
          <span>
            Posted by{' '}
            <Link href={`/u/${t.authorName}`} style={{ fontWeight: '700', color: '#0f172a' }}>
              @{t.authorName}
            </Link>
          </span>
          <span
            style={{
              fontSize: '9px',
              fontWeight: '700',
              padding: '1px 5px',
              borderRadius: '2px',
              textTransform: 'uppercase',
              backgroundColor: t.authorRole === 'OWNER' ? '#fffbea' : t.authorRole === 'MODERATOR' ? '#ebf8ff' : '#f1f5f9',
              color: t.authorRole === 'OWNER' ? '#b7791f' : t.authorRole === 'MODERATOR' ? '#2b6cb0' : '#475569',
              border: `1px solid ${t.authorRole === 'OWNER' ? '#f6e05e' : t.authorRole === 'MODERATOR' ? '#90cdf4' : '#cbd5e1'}`,
            }}
          >
            {t.authorRole}
          </span>
          <span>&bull;</span>
          <span suppressHydrationWarning>{formatDate(t.createdAt)}</span>
        </div>

        {/* Feed Post Title */}
        <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '6px', lineHeight: '1.3' }}>
          <Link href={`/c/${slug}/posts/${t.id}`} style={{ color: '#0f172a' }}>
            {t.type === 'image' && <span style={{ fontSize: '11px', color: '#0055cc', marginRight: '6px', fontWeight: '700' }}>[IMG]</span>}
            {t.title}
          </Link>
        </h3>

        {/* Content Snippet */}
        <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5', marginBottom: '10px' }}>
          <FormattedText content={t.content.length > 180 ? t.content.substring(0, 180) + '...' : t.content} />
        </div>

        {/* Image Feed Preview */}
        {t.type === 'image' && t.imageUrl && (
          <div style={{ marginBottom: '10px' }}>
            <img
              src={t.imageUrl}
              alt={t.title}
              style={{
                maxWidth: '100%',
                maxHeight: '320px',
                objectFit: 'cover',
                borderRadius: '3px',
                border: '1px solid #cbd5e1',
              }}
            />
          </div>
        )}
      </div>

      {/* Feed Card Footer */}
      <div className="feed-card-footer">
        <Link
          href={`/c/${slug}/posts/${t.id}`}
          style={{ fontWeight: '600', color: '#0055cc', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Replies ({t.commentCount})
        </Link>

        <span style={{ color: '#cbd5e1' }}>&bull;</span>

        <VoteButton targetId={t.id} initialScore={t.voteScore} initialUserVote={t.userVote} isLoggedIn={isLoggedIn} />

        <span style={{ color: '#cbd5e1' }}>&bull;</span>

        <span style={{ color: '#64748b' }} suppressHydrationWarning>
          Last activity {formatDate(t.lastActivity)}
        </span>
      </div>
    </div>
  );
}
