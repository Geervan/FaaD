'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from './ConfirmModal';

export default function DeleteActionButton({
  type,
  id,
  redirectUrl,
}: {
  type: 'post' | 'comment';
  id: string;
  redirectUrl?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const confirmDelete = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const endpoint = type === 'post' ? `/api/posts/${id}` : `/api/comments/${id}`;
      const res = await fetch(endpoint, { method: 'DELETE' });

      if (res.ok) {
        setShowModal(false);
        if (redirectUrl) {
          router.push(redirectUrl);
        } else {
          router.refresh();
        }
      } else {
        const data = await res.json();
        setErrorMessage(data.error || 'Failed to delete item.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('An unexpected network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} disabled={loading} className="btn btn-danger btn-sm">
        Delete {type === 'post' ? 'Post' : 'Comment'}
      </button>

      <ConfirmModal
        isOpen={showModal}
        title={`Delete ${type === 'post' ? 'Post' : 'Comment'}?`}
        message={
          errorMessage ||
          `Are you sure you want to delete this ${type}? This action cannot be undone.`
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={loading}
        onConfirm={confirmDelete}
        onCancel={() => {
          setShowModal(false);
          setErrorMessage(null);
        }}
      />
    </>
  );
}
