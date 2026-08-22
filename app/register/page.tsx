'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, avatarUrl }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Registration failed.');
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message || 'Server error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-card">
      <h1 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px', textAlign: 'center' }}>
        Create Forum Account
      </h1>
      <p style={{ fontSize: '12px', color: '#5c6370', textAlign: 'center', marginBottom: '20px' }}>
        Enter your details to create a user account.
      </p>

      {error && (
        <div style={{ background: '#fff5f5', border: '1px solid #f87171', color: '#d9381e', padding: '8px 12px', fontSize: '13px', borderRadius: '3px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input
            type="text"
            className="form-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="e.g. alex_designer"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Password</label>
          <input
            type="password"
            className="form-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="At least 6 characters"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Confirm Password</label>
          <input
            type="password"
            className="form-input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">
            Profile Picture Link <span style={{ fontWeight: '400', color: '#64748b' }}>(Optional)</span>
          </label>
          <input
            type="url"
            className="form-input"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://example.com/avatar.png"
          />
          <div className="form-help">Optional. Leave blank to automatically generate a unique avatar badge.</div>
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {loading ? 'Creating Account...' : 'Register'}
        </button>
      </form>

      <div style={{ marginTop: '16px', fontSize: '13px', textAlign: 'center', color: '#5c6370' }}>
        Already have an account? <Link href="/login">Log in here</Link>
      </div>
    </div>
  );
}
