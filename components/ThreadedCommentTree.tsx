'use client';

import { useState } from 'react';
import Link from 'next/link';
import VoteButton from './VoteButton';
import DeleteActionButton from './DeleteActionButton';
import FormattedText from './FormattedText';

export interface SerializedCommentNode {
  id: string;
  postId: string;
  authorId: string;
  authorUsername: string;
  authorAvatarUrl?: string;
  authorRole: string;
  parentCommentId: string | null;
  content: string;
  createdAt: number;
  voteScore: number;
  userVote: number;
  canDelete: boolean;
  canEdit: boolean;
  children: SerializedCommentNode[];
}

interface ThreadedCommentTreeProps {
  nodes: SerializedCommentNode[];
  postId: string;
  isLoggedIn: boolean;
  communitySlug: string;
}

export default function ThreadedCommentTree({ nodes, postId, isLoggedIn, communitySlug }: ThreadedCommentTreeProps) {
  if (nodes.length === 0) {
    return (
      <div style={{ border: '1px solid #e2e8f0', padding: '20px', textAlign: 'center', borderRadius: '3px', color: '#64748b' }}>
        No replies yet. Be the first to join the discussion below!
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {nodes.map((node) => (
        <CommentItem key={node.id} node={node} postId={postId} isLoggedIn={isLoggedIn} communitySlug={communitySlug} depth={0} />
      ))}
    </div>
  );
}

function CommentItem({
  node,
  postId,
  isLoggedIn,
  communitySlug,
  depth = 0,
}: {
  node: SerializedCommentNode;
  postId: string;
  isLoggedIn: boolean;
  communitySlug: string;
  depth: number;
}) {
  const [isReplying, setIsReplying] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(node.content);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  const [error, setError] = useState('');

  const formatDate = (timestamp: number) => {
    const diffMs = Date.now() - timestamp;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    setIsSubmittingReply(true);
    setError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content: replyText, parentCommentId: node.id }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to post reply');
      }

      setReplyText('');
      setIsReplying(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editText.trim()) return;

    setIsSubmittingEdit(true);
    setError('');

    try {
      const res = await fetch(`/api/comments/${node.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editText }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update comment');
      }

      setIsEditing(false);
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  return (
    <div
      style={{
        marginLeft: depth > 0 ? `${Math.min(depth * 18, 54)}px` : '0px',
        borderLeft: depth > 0 ? '2px solid #cbd5e1' : 'none',
        paddingLeft: depth > 0 ? '12px' : '0px',
      }}
    >
      <div
        style={{
          border: '1px solid #e2e8f0',
          borderRadius: '3px',
          backgroundColor: '#ffffff',
          padding: '12px 14px',
          boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
        }}
      >
        {/* Comment Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={node.authorAvatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${node.authorUsername}`}
              alt={node.authorUsername}
              style={{ width: '22px', height: '22px', borderRadius: '2px', border: '1px solid #cbd5e1' }}
            />
            <Link href={`/u/${node.authorUsername}`} style={{ fontWeight: '700', color: '#0f172a' }}>
              @{node.authorUsername}
            </Link>
            <span
              style={{
                fontSize: '10px',
                fontWeight: '700',
                padding: '1px 5px',
                borderRadius: '2px',
                textTransform: 'uppercase',
                backgroundColor: node.authorRole === 'OWNER' ? '#fffbea' : node.authorRole === 'MODERATOR' ? '#ebf8ff' : '#f1f5f9',
                color: node.authorRole === 'OWNER' ? '#b7791f' : node.authorRole === 'MODERATOR' ? '#2b6cb0' : '#475569',
                border: `1px solid ${node.authorRole === 'OWNER' ? '#f6e05e' : node.authorRole === 'MODERATOR' ? '#90cdf4' : '#cbd5e1'}`,
              }}
            >
              {node.authorRole}
            </span>
            <span style={{ color: '#94a3b8' }}>&bull; {formatDate(node.createdAt)}</span>
          </div>
        </div>

        {/* Comment Body / Edit View */}
        {isEditing ? (
          <form onSubmit={handleEditSubmit} style={{ marginBottom: '10px' }}>
            <textarea
              rows={3}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                fontFamily: 'inherit',
                marginBottom: '6px',
              }}
              required
            />
            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="submit" disabled={isSubmittingEdit} className="btn btn-primary btn-sm">
                {isSubmittingEdit ? 'Saving...' : 'Save Edit'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <div style={{ fontSize: '14px', lineHeight: '1.5', color: '#0f172a', marginBottom: '10px' }}>
            <FormattedText content={node.content} />
          </div>
        )}

        {/* Comment Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLoggedIn && (
              <button
                onClick={() => {
                  setIsReplying(!isReplying);
                  setIsEditing(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0055cc',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {isReplying ? 'Cancel Reply' : 'Reply'}
              </button>
            )}

            {node.canEdit && !isEditing && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setIsReplying(false);
                  setEditText(node.content);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#475569',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                Edit
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {node.canDelete && <DeleteActionButton type="comment" id={node.id} />}
            <VoteButton targetId={node.id} initialScore={node.voteScore} initialUserVote={node.userVote} isLoggedIn={isLoggedIn} />
          </div>
        </div>

        {/* Nested Reply Form */}
        {isReplying && (
          <form onSubmit={handleReplySubmit} style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#475569', marginBottom: '4px' }}>
              Replying to @{node.authorUsername}:
            </div>
            {error && <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '6px' }}>{error}</div>}
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Write your reply..."
              style={{
                width: '100%',
                padding: '8px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '3px',
                fontFamily: 'inherit',
                marginBottom: '8px',
              }}
              required
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" disabled={isSubmittingReply} className="btn btn-primary btn-sm">
                {isSubmittingReply ? 'Posting...' : 'Post Reply'}
              </button>
              <button type="button" onClick={() => setIsReplying(false)} className="btn btn-secondary btn-sm">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Child Comment Replies */}
      {node.children && node.children.length > 0 && (
        <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {node.children.map((child) => (
            <CommentItem key={child.id} node={child} postId={postId} isLoggedIn={isLoggedIn} communitySlug={communitySlug} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}
