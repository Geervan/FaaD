'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import ConfirmModal from '@/components/ConfirmModal';

interface ModUser {
  id: string;
  username: string;
  avatarUrl?: string;
}

export default function ModeratorManagementPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const [moderators, setModerators] = useState<ModUser[]>([]);
  const [usernameInput, setUsernameInput] = useState('');
  const [fetchingMods, setFetchingMods] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [unassignTarget, setUnassignTarget] = useState<string | null>(null);

  const fetchModerators = async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/communities/${slug}/moderators`);
      const data = await res.json();
      if (res.ok && data.success) {
        setModerators(data.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch moderators:', e);
    } finally {
      setFetchingMods(false);
    }
  };

  useEffect(() => {
    fetchModerators();
  }, [slug]);

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
        fetchModerators();
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
        setMessage(`Removed @${unassignTarget} from moderators.`);
        fetchModerators();
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

      <div className="form-card" style={{ maxWidth: '650px' }}>
        <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>Community Moderator Management</h1>
        <p style={{ fontSize: '12px', color: '#5c6370', marginBottom: '16px' }}>
          Assign or remove community moderators for <strong>/c/{slug}</strong>. Moderators can edit/delete topics and comments.
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
            <label className="form-label">Assign New Moderator</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                className="form-input"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter member username (e.g. alice)..."
                required
              />
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ flexShrink: 0 }}>
                Assign Moderator
              </button>
            </div>
          </div>
        </form>

        {/* Active Moderators Roster */}
        <div style={{ marginBottom: '24px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: '700', marginBottom: '10px', color: '#0f172a' }}>
            Active Moderators ({moderators.length})
          </h2>

          {fetchingMods ? (
            <div style={{ fontSize: '13px', color: '#64748b' }}>Loading moderators...</div>
          ) : moderators.length === 0 ? (
            <div style={{ border: '1px solid #dee2e6', padding: '12px 16px', borderRadius: '3px', color: '#64748b', fontSize: '13px' }}>
              No extra moderators assigned yet. Only the community owner has moderation privileges.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {moderators.map((m) => (
                <div
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '3px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={m.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.username}`}
                      alt={m.username}
                      style={{ width: '28px', height: '28px', borderRadius: '2px', border: '1px solid #cbd5e1' }}
                    />
                    <div>
                      <Link href={`/u/${m.username}`} style={{ fontWeight: '700', fontSize: '13px' }}>
                        @{m.username}
                      </Link>
                      <span className="role-badge role-badge-moderator" style={{ marginLeft: '8px', fontSize: '10px' }}>
                        MODERATOR
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => setUnassignTarget(m.username)}
                    disabled={loading}
                    className="btn btn-secondary btn-sm"
                    style={{ color: '#dc2626', borderColor: '#fca5a5', fontSize: '12px' }}
                  >
                    Remove as Moderator
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href={`/c/${slug}`} className="btn btn-secondary btn-sm">
            &larr; Back to Community
          </Link>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(unassignTarget)}
        title="Remove Moderator?"
        message={`Are you sure you want to remove @${unassignTarget} as a moderator for /c/${slug}?`}
        confirmLabel="Remove Moderator"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={loading}
        onConfirm={confirmUnassign}
        onCancel={() => setUnassignTarget(null)}
      />
    </div>
  );
}
