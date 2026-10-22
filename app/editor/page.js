'use client';

import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { getMaterial } from '@/lib/materials';
import { EmptyState, PageLoader, RequireAuth } from '@/components/ui';
import PDFEditor from '@/components/PDFEditor';
import './editor.css';

function EditorContent() {
  const materialId = useSearchParams().get('id');
  // { status: 'loading' | 'ready' | 'missing' | 'error', material?: object }
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!materialId) return;
    let cancelled = false;
    getMaterial(materialId)
      .then((material) => {
        if (!cancelled) setState(material ? { status: 'ready', material } : { status: 'missing' });
      })
      .catch((err) => {
        console.error('Error fetching material', err);
        if (!cancelled) setState({ status: 'error' });
      });
    return () => { cancelled = true; };
  }, [materialId, attempt]);

  const backToLibrary = (
    <Link href="/dashboard" className="btn btn-gradient">
      <i className="material-icons">auto_stories</i> Back to library
    </Link>
  );

  if (!materialId || state.status === 'missing') {
    return (
      <main className="editor-state">
        <title>Material not found · Revibe Training</title>
        <EmptyState
          icon="search_off"
          title="We couldn’t find that material"
          text="It may have been removed or the link is out of date."
          action={backToLibrary}
        />
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="editor-state">
        <title>Editor · Revibe Training</title>
        <EmptyState
          icon="cloud_off"
          title="The editor didn’t load"
          text="Check your connection and try again."
          action={
            <div className="editor-state-actions">
              <button className="btn btn-gradient" onClick={() => { setState({ status: 'loading' }); setAttempt((n) => n + 1); }}>
                <i className="material-icons">refresh</i> Try again
              </button>
              <Link href="/dashboard" className="btn btn-outline">Back to library</Link>
            </div>
          }
        />
      </main>
    );
  }

  if (state.status === 'loading') return <PageLoader label="Opening editor" />;

  const { material } = state;
  return (
    <>
      <title>{`Edit: ${material.name} · Revibe Training`}</title>
      <PDFEditor
        url={material.downloadURL}
        title={material.name}
        category={material.category}
        materialId={material.id || materialId}
      />
    </>
  );
}

export default function EditorPage() {
  return (
    <RequireAuth role="trainer">
      <Suspense fallback={<PageLoader label="Opening editor" />}>
        <EditorContent />
      </Suspense>
    </RequireAuth>
  );
}
