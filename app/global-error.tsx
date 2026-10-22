'use client';

import { useEffect, useState } from 'react';
import { onStorageError } from '@/lib/storageLogger';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    try {
      onStorageError(error);
    } catch {
      // Never let error reporting throw inside the error boundary.
    }
  }, [error]);

  const handleResetLocalData = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.clear();
      }
    } catch {
      // Ignore storage access failures.
    }
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <html lang="en">
      <body>
        <main
          style={{
            display: 'flex',
            minHeight: '100vh',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2rem',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
          }}
        >
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ maxWidth: '32rem', color: '#555' }}>
            An unexpected error occurred while loading the app. You can try
            again, head back to the dashboard, or reset your local data if the
            problem persists.
          </p>
          {error.digest ? (
            <p style={{ fontSize: '0.75rem', color: '#888' }}>
              Error reference: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.75rem',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
            <a
              href="/dashboard"
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #2563eb',
                color: '#2563eb',
                textDecoration: 'none',
              }}
            >
              Go to dashboard
            </a>
            <button
              type="button"
              onClick={() => setShowConfirm(true)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '0.375rem',
                border: '1px solid #dc2626',
                background: 'transparent',
                color: '#dc2626',
                cursor: 'pointer',
              }}
            >
              Reset local data
            </button>
          </div>

          {showConfirm ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="global-error-reset-title"
              style={{
                position: 'fixed',
                inset: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.5)',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: '0.5rem',
                  padding: '1.5rem',
                  maxWidth: '24rem',
                  width: '100%',
                  textAlign: 'left',
                }}
              >
                <h2
                  id="global-error-reset-title"
                  style={{ fontSize: '1.125rem', fontWeight: 600 }}
                >
                  Reset local data?
                </h2>
                <p style={{ marginTop: '0.5rem', color: '#555' }}>
                  This will clear all locally stored data and reload the app.
                  This action cannot be undone.
                </p>
                <div
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    justifyContent: 'flex-end',
                    marginTop: '1rem',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #ccc',
                      background: 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleResetLocalData}
                    style={{
                      padding: '0.5rem 1rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      background: '#dc2626',
                      color: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    Reset and reload
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </main>
      </body>
    </html>
  );
}