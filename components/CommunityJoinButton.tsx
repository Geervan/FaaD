'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CommunityJoinButton({
  slug,
  isMember,
  isOwner,
  isLoggedIn,
}: {
  slug: string;
  isMember: boolean;
  isOwner: boolean;
  isLoggedIn: boolean;
}) {
  const router = useRouter();
  const [memberState, setMemberState] = useState(isMember);
  const [loading, setLoading] = useState(false);

  if (isOwner) {
    return <span className="role-badge role-badge-owner">Community Owner</span>;
  }

  if (!isLoggedIn) {
    return null;
  }

  const handleToggle = async () => {
    if (loading) return;
    setLoading(true);

    const nextState = !memberState;
    // Optimistic UI update
    setMemberState(nextState);

    try {
      const endpoint = `/api/communities/${slug}/join`;
      const method = memberState ? 'DELETE' : 'POST';

      const res = await fetch(endpoint, { method });
      if (!res.ok) {
        // Revert if failed
        setMemberState(memberState);
      } else {
        router.refresh();
        window.location.reload();
      }
    } catch (err) {
      console.error('Join/Leave error:', err);
      setMemberState(memberState);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`btn ${memberState ? 'btn-secondary' : 'btn-primary'} btn-sm`}
    >
      {loading ? 'Updating...' : memberState ? 'Leave Community' : 'Join Community'}
    </button>
  );
}
