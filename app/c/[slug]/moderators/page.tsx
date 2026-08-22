'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

export default function ModeratorManagementPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [usernameInput, setUsernameInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [unassignTarget, setUnassignTarget] = useState<string | null>(null);

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usernameInput.trim()) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/communities/${slug}/moderators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: usernameInput.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to assign moderator.');
      } else {
        setMessage(`Successfully assigned @${usernameInput.trim()} as a Moderator!`);
        setUsernameInput('');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  const confirmUnassign = async () => {
    if (!unassignTarget) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch(`/api/communities/${slug}/moderators`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: unassignTarget }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Failed to unassign moderator.');
      } else {
        setMessage(`Unassigned @${unassignTarget} as moderator.`);
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
      setUnassignTarget(null);
    }
  };

  return (
    <div>
      <div className="forum-breadcrumbs">
        <Link href="/">Forum Index</Link> &gt; <Link href={`/c/${slug}`}>/c/{slug}</Link> &gt; <span>Manage Moderators</span>
      </div>

      <div className="form-card" style={{ maxWidth: '600px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Community Moderator Management</h1>
        <p style={{ fontSize: '12px', color: '#5c6370', marginBottom: '16px' }}>
          Assign community members to assist with moderating and deleting inappropriate posts/comments in /c/{slug}.
        </p>

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

        {/* Assign Form */}
        <form onSubmit={handleAssign} style={{ marginBottom: '24px', borderBottom: '1px solid #dee2e6', paddingBottom: '20px' }}>
          <div className="form-group">
            <label className="form-label">Assign New Moderator by Username</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter member username..."
                required
              />
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flexShrink: 0 }}>
                Assign Moderator
              </button>
            </div>
          </div>
        </form>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href={`/c/${slug}`} className="btn btn-secondary btn-sm">
            &larr; Back to Community
          </Link>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(unassignTarget)}
        title="Unassign Moderator?"
        message={`Are you sure you want to remove @${unassignTarget} as a moderator for /c/${slug}?`}
        confirmLabel="Unassign"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={loading}
        onConfirm={confirmUnassign}
        onCancel={() => setUnassignTarget(null)}
      />
    </div>
  );
}
