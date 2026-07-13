'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import PDFEditor from '@/components/PDFEditor';
import './editor.css';

function EditorContent() {
  const searchParams = useSearchParams();
  const materialId = searchParams.get('id');
  const { user, isTrainer, loading } = useAuth();
  const router = useRouter();
  
  const [material, setMaterial] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Only trainers can access the editor
    if (!loading && (!user || !isTrainer)) {
      router.push('/dashboard');
    }
  }, [user, isTrainer, loading, router]);

  useEffect(() => {
    if (!materialId || loading || !user) return;

    const fetchMaterial = async () => {
      try {
        const docRef = doc(db, 'materials', materialId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setMaterial(docSnap.data());
        } else {
          setError('Material not found');
        }
      } catch (err) {
        console.error('Error fetching material', err);
        setError('Failed to load document details');
      }
    };

    fetchMaterial();
  }, [materialId, user, loading]);

  if (loading || !user || !isTrainer) return null;
  
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
        <i className="material-icons animate-spin text-accent-pink" style={{fontSize: '48px'}}>refresh</i>
        <p className="mt-4 font-medium text-muted">Preparing experimental editor...</p>
      </div>
    );
  }

  return (
    <PDFEditor 
      url={material.downloadURL} 
      title={material.name} 
      materialId={material.id} 
    />
  );
}

export default function EditorPage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
      <EditorContent />
    </Suspense>
  );
}
