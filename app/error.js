'use client'; // Error boundaries must be Client Components

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({ error, unstable_retry }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="page-loader" style={{ padding: 24, textAlign: 'center' }}>
      <title>Something went wrong · Revibe Training</title>
      <div className="empty-icon" style={{ width: 72, height: 72 }}>
        <i className="material-icons" style={{ fontSize: 34 }}>sentiment_dissatisfied</i>
      </div>
      <h1 className="text-h2">That didn’t go to plan</h1>
      <p className="text-muted" style={{ maxWidth: 420 }}>
        Something broke while loading this page. Try again, and if it keeps happening let the training team know.
      </p>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 }}>
        <button className="btn btn-gradient" onClick={() => unstable_retry()}>
          <i className="material-icons">refresh</i> Try again
        </button>
        <Link href="/dashboard" className="btn btn-outline">Back to library</Link>
      </div>
    </main>
  );
}
