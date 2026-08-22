'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateCommunityPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/communities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to create community.');
      } else {
        router.push(`/c/${data.data.slug}`);
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
        <Link href="/">Forum Index</Link> &gt; <span>Create New Community</span>
      </div>

      <div className="form-card" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Create a New Forum Community</h1>
        <p style={{ fontSize: '12px', color: '#5c6370', marginBottom: '16px' }}>
          As the creator, you will automatically become the Community Owner.
        </p>

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #f87171', color: '#d9381e', padding: '8px 12px', fontSize: '13px', borderRadius: '3px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Community Name</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Design Critique, Web Tech, General Discussion"
              required
            />
            <div className="form-help">Unique slug will be automatically generated (e.g. /c/design-critique).</div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this community about?"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Creating...' : 'Create Community'}
            </button>
            <Link href="/" className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
