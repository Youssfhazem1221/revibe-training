'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PDFViewer from '@/components/PDFViewer';
import './viewer.css';

function ViewerContent() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get('id');
  const { user, isTrainer, loading } = useAuth();
  const router = useRouter();
  
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!materialId || loading || !user) return;

    let cancelled = false;
    const fetchMaterial = async () => {
      try {
        const docRef = doc(db, 'materials', materialId);
        const docSnap = await getDoc(docRef);
        
        if (cancelled) return;
        if (docSnap.exists()) {
          setMaterial(docSnap.data());
        } else {
          setError('Material not found');
        }
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching material', err);
        setError('Failed to load document details');
      }
    };

    fetchMaterial();
    return () => { cancelled = true; };
  }, [materialId, user, loading]);

  if (loading || !user) return null;
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-soft">
        <i className="material-icons text-color-danger text-display mb-4">error_outline</i>
        <h2 className="text-h2 font-poppins text-primary mb-2">Oops!</h2>
        <p className="text-body text-muted mb-6">{error}</p>
        <button className="btn btn-gradient" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  if (!material) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-bg-soft">
        <i className="material-icons animate-spin text-accent-purple" style={{fontSize: '48px'}}>refresh</i>
        <p className="mt-4 font-medium text-muted">Preparing your document...</p>
      </div>
    );
  }

  return (
    <PDFViewer 
      url={material.downloadURL} 
      title={material.name} 
      materialId={materialId}
      pageCount={material.pageCount}
      isTrainer={isTrainer}
      textContent={material.textContent}
    />
  );
}

export default function ViewerPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <ViewerContent />
    </Suspense>
  );
}
