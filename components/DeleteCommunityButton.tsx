'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ConfirmModal from './ConfirmModal';

export default function DeleteCommunityButton({ slug, name }: { slug: string; name: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleDelete = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/communities/${slug}`, { method: 'DELETE' });
      const data = await res.json();

      if (res.ok && data.success) {
        setShowModal(false);
        router.push('/');
        router.refresh();
      } else {
        setErrorMessage(data.error || 'Failed to delete community.');
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={() => setShowModal(true)} disabled={loading} className="btn btn-danger btn-sm">
        Delete Community
      </button>

      <ConfirmModal
        isOpen={showModal}
        title={`Delete /c/${slug}?`}
        message={
          errorMessage ||
          `Are you sure you want to delete "${name}"? All topics, comments, and member rosters in this community will be permanently removed.`
        }
        confirmLabel="Delete Community"
        cancelLabel="Cancel"
        variant="danger"
        isLoading={loading}
        onConfirm={handleDelete}
        onCancel={() => {
          setShowModal(false);
          setErrorMessage(null);
        }}
      />
    </>
  );
}
