'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CommentForm({
  postId,
  parentCommentId = null,
  isLoggedIn,
  onCancel,
}: {
  postId: string;
  parentCommentId?: string | null;
  isLoggedIn: boolean;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isLoggedIn) {
    return (
      <div style={{ border: '1px solid #dee2e6', padding: '16px', borderRadius: '3px', background: '#f8f9fa', fontSize: '13px', color: '#5c6370' }}>
        You must be logged in to participate in discussions.{' '}
        <a href="/login" style={{ fontWeight: '600' }}>
          Log in
        </a>{' '}
        or{' '}
        <a href="/register" style={{ fontWeight: '600' }}>
          Register
        </a>
        .
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ postId, content, parentCommentId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to post comment.');
      } else {
        setContent('');
        if (onCancel) onCancel();
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ marginTop: '12px' }}>
      {error && <div style={{ color: '#d9381e', fontSize: '12px', marginBottom: '8px' }}>{error}</div>}
      <div className="form-group" style={{ marginBottom: '8px' }}>
        <textarea
          className="form-textarea"
          rows={4}
          placeholder="Write your reply..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
        />
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button type="submit" disabled={loading} className="btn btn-primary btn-sm">
          {loading ? 'Posting...' : 'Post Reply'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-secondary btn-sm">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
