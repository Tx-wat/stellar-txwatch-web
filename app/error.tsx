'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onStorageError } from '@/lib/storageLogger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    try {
      onStorageError({
        key: 'app-error',
        rawValue: null,
        error,
        timestamp: Date.now(),
      });
    } catch {
      // Never let error reporting throw inside the error boundary.
    }
  }, [error]);

  const handleResetLocalData = () => {
    try {
      window.localStorage.clear();
    } catch {
      // Ignore storage access failures.
    }
    window.location.reload();
  };

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-sm text-gray-600 dark:text-gray-400">
        An unexpected error occurred while rendering this page. You can try
        again, head back to the dashboard, or reset your local data if the
        problem persists.
      </p>
      {error.digest && (
        <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
          Error ID: {error.digest}
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          Go to dashboard
        </Link>
        <button
          type="button"
          onClick={() => setShowConfirm(true)}
          className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-950"
        >
          Reset local data
        </button>
      </div>

      {showConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-6 text-left shadow-xl dark:bg-gray-900">
            <h2
              id="reset-dialog-title"
              className="text-lg font-semibold text-gray-900 dark:text-gray-100"
            >
              Reset local data?
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This will clear all data stored in your browser for this app and
              reload the page. This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetLocalData}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Reset and reload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}