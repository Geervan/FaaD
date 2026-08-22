'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function EditProfilePage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          setUsername(data.data.username);
          setBio(data.data.bio || '');
          setAvatarUrl(data.data.avatarUrl || '');
        } else {
          router.push('/login');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`/api/users/${username}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to update profile.');
      } else {
        setMessage('Profile updated successfully!');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px', textAlign: 'center' }}>Loading user settings...</div>;
  }

  return (
    <div>
      <div className="forum-breadcrumbs">
        <Link href="/">Forum Index</Link> &gt; <Link href={`/u/${username}`}>@{username}</Link> &gt; <span>Edit Profile</span>
      </div>

      <div className="form-card" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Edit Profile: @{username}</h1>

        {message && (
          <div style={{ background: '#ebfbee', border: '1px solid #8ce99a', color: '#2b8a3e', padding: '8px 12px', fontSize: '13px', borderRadius: '3px', marginBottom: '16px' }}>
            {message}
          </div>
        )}

        {error && (
          <div style={{ background: '#fff5f5', border: '1px solid #f87171', color: '#d9381e', padding: '8px 12px', fontSize: '13px', borderRadius: '3px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Bio</label>
            <textarea
              className="form-textarea"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell community members about yourself..."
            />
          </div>

          <div className="form-group">
            <label className="form-label">Avatar Image URL</label>
            <input
              type="url"
              className="form-input"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/my-avatar.png"
            />
            <div className="form-help">Provide a direct link to an avatar image (SVG, PNG, JPEG).</div>
          </div>

          {avatarUrl && (
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '4px' }}>Avatar Preview:</div>
              <img
                src={avatarUrl}
                alt="Preview"
                style={{ width: '48px', height: '48px', borderRadius: '2px', border: '1px solid #dee2e6' }}
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="submit" disabled={saving} className="btn btn-primary">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <Link href={`/u/${username}`} className="btn btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
