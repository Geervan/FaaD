'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function VoteButton({
  targetId,
  initialScore,
  initialUserVote,
  isLoggedIn,
}: {
  targetId: string;
  initialScore: number;
  initialUserVote: number;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [score, setScore] = useState(initialScore);
  const [userVote, setUserVote] = useState(initialUserVote);
  const [loading, setLoading] = useState(false);

  const handleVote = async (direction: 1 | -1) => {
    if (!isLoggedIn) {
      router.push('/login');
      return;
    }

    if (loading) return;
    setLoading(true);

    const newDirection = userVote === direction ? 0 : direction;
    const diff = newDirection - userVote;

    // Optimistic UI update
    setUserVote(newDirection);
    setScore((prev) => prev + diff);

    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId, direction: newDirection }),
      });

      if (!res.ok) {
        setUserVote(userVote);
        setScore(initialScore);
      }
    } catch (err) {
      setUserVote(userVote);
      setScore(initialScore);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        backgroundColor: '#ffffff',
        border: '1px solid #cbd5e1',
        borderRadius: '3px',
        padding: '2px 6px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
      }}
    >
      {/* Upvote Button (Simple Green #16a34a) */}
      <button
        onClick={() => handleVote(1)}
        style={{
          background: userVote === 1 ? '#f0fdf4' : 'transparent',
          border: userVote === 1 ? '1px solid #86efac' : '1px solid transparent',
          borderRadius: '2px',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s ease',
        }}
        title="Upvote"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={userVote === 1 ? '#16a34a' : 'none'}
          stroke="#16a34a"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>

      {/* Score Tally */}
      <span
        style={{
          fontSize: '12px',
          fontWeight: '700',
          minWidth: '18px',
          textAlign: 'center',
          color: userVote === 1 ? '#16a34a' : userVote === -1 ? '#dc2626' : '#0f172a',
        }}
      >
        {score}
      </span>

      {/* Downvote Button (Simple Red #dc2626) */}
      <button
        onClick={() => handleVote(-1)}
        style={{
          background: userVote === -1 ? '#fef2f2' : 'transparent',
          border: userVote === -1 ? '1px solid #fca5a5' : '1px solid transparent',
          borderRadius: '2px',
          cursor: 'pointer',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          transition: 'all 0.15s ease',
        }}
        title="Downvote"
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill={userVote === -1 ? '#dc2626' : 'none'}
          stroke="#dc2626"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
    </div>
  );
}
