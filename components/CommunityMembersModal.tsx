'use client';

import { useState } from 'react';
import Link from 'next/link';

export interface MemberDetail {
  id: string;
  username: string;
  avatarUrl?: string;
  role: 'OWNER' | 'MODERATOR' | 'MEMBER';
  joinedAt: number;
}

interface CommunityMembersModalProps {
  communityName: string;
  communitySlug: string;
  members: MemberDetail[];
}

export default function CommunityMembersModal({ communityName, communitySlug, members }: CommunityMembersModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Recent';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          margin: 0,
          color: '#0055cc',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          fontWeight: '600',
          textDecoration: 'underline',
        }}
        title="Click to view all community members"
      >
        Members: {members.length}
      </button>

      {isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
          onClick={() => setIsOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '1px solid #102a43',
              borderRadius: '3px',
              width: '90%',
              maxWidth: '540px',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div
              style={{
                backgroundColor: '#0f2942',
                color: '#ffffff',
                padding: '10px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                borderBottom: '2px solid #0055cc',
              }}
            >
              <span style={{ fontWeight: '700', fontSize: '14px' }}>
                Community Members &ndash; /c/{communitySlug} ({members.length})
              </span>
              <button
                onClick={() => setIsOpen(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  padding: '0 4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '16px', overflowY: 'auto' }}>
              <p style={{ fontSize: '12px', color: '#627d98', marginBottom: '12px' }}>
                Registered members and leadership in <strong>/c/{communitySlug}</strong>:
              </p>

              <table className="forum-table" style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th style={{ width: '50%' }}>User</th>
                    <th style={{ width: '25%', textAlign: 'center' }}>Role</th>
                    <th style={{ width: '25%', textAlign: 'right' }}>Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <img
                            src={m.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${m.username}`}
                            alt={m.username}
                            style={{ width: '24px', height: '24px', borderRadius: '2px', border: '1px solid #bcccdc' }}
                          />
                          <Link href={`/u/${m.username}`} onClick={() => setIsOpen(false)} style={{ fontWeight: '600', fontSize: '13px' }}>
                            @{m.username}
                          </Link>
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '2px',
                            textTransform: 'uppercase',
                            backgroundColor: m.role === 'OWNER' ? '#fffbea' : m.role === 'MODERATOR' ? '#ebf8ff' : '#f0f4f8',
                            color: m.role === 'OWNER' ? '#b7791f' : m.role === 'MODERATOR' ? '#2b6cb0' : '#485563',
                            border: `1px solid ${m.role === 'OWNER' ? '#f6e05e' : m.role === 'MODERATOR' ? '#90cdf4' : '#bcccdc'}`,
                          }}
                        >
                          {m.role}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontSize: '11px', color: '#627d98' }}>{formatDate(m.joinedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '10px 16px',
                borderTop: '1px solid #d9e2ec',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button onClick={() => setIsOpen(false)} className="btn btn-secondary btn-sm">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
