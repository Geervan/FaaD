'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';

export default function CreatePostPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState<'text' | 'image'>('text');
  const [imageUrl, setImageUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    if (postType === 'image' && !imageUrl.trim()) {
      setError('Please provide a valid Image URL for image posts.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          communitySlug: slug,
          title,
          content,
          type: postType,
          imageUrl: postType === 'image' ? imageUrl : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create post.');
      } else {
        router.push(`/c/${slug}/posts/${data.data.id}`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="forum-breadcrumbs">
        <Link href="/">Forum Index</Link> &gt; <Link href={`/c/${slug}`}>/c/{slug}</Link> &gt; <span>New Post</span>
      </div>

      <div className="form-card" style={{ maxWidth: '680px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Start a New Post in /c/{slug}</h1>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #f87171', color: '#d9381e', padding: '8px 12px', fontSize: '13px', borderRadius: '3px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Post Format</label>
            <div style={{ display: 'flex', gap: '16px' }}>
              <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="radio"
                  name="postType"
                  value="text"
                  checked={postType === 'text'}
                  onChange={() => setPostType('text')}
                />
                Text Discussion
              </label>
              <label style={{ fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <input
                  type="radio"
                  name="postType"
                  value="image"
                  checked={postType === 'image'}
                  onChange={() => setPostType('image')}
                />
                Image Post (External URL)
              </label>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Topic Title</label>
            <input
              type="text"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Descriptive title..."
              required
            />
          </div>

          {postType === 'image' && (
            <div className="form-group">
              <label className="form-label">Image URL</label>
              <input
                type="url"
                className="form-input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                required
              />
              <div className="form-help">Direct link to an image file (PNG, JPEG, WebP, SVG).</div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">{postType === 'image' ? 'Image Description / Discussion Text' : 'Post Content'}</label>
            <textarea
              className="form-textarea"
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your topic body..."
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Posting...' : 'Submit Topic'}
            </button>
            <Link href={`/c/${slug}`} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
