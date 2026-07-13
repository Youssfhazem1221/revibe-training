'use client';

import { useState, useRef } from 'react';
import { uploadMaterial } from '@/lib/materials';
import { useAuth } from '@/contexts/AuthContext';

export default function UploadZone({ onUploadComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const { user } = useAuth();

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = async (e) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    const isPDF = file.type === 'application/pdf';
    const isPPTX = file.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' || file.name.toLowerCase().endsWith('.pptx');

    if (!isPDF && !isPPTX) {
      setError('Please upload a PDF or PPTX file.');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. Maximum size is 50MB.');
      return;
    }

    setIsUploading(true);
    setProgress(0);
    setError('');

    try {
      let pageCount = 0;
      let textContent = [];
      let thumbnailURL = null;

      try {
        if (isPDF) {
          const pdfjsLib = await import('pdfjs-dist');
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          pageCount = pdf.numPages;

          // Extract text content for search indexing
          for (let i = 1; i <= Math.min(pageCount, 50); i++) {
            const page = await pdf.getPage(i);
            const textObj = await page.getTextContent();
            const pageText = textObj.items.map(item => item.str).join(' ');
            textContent.push({ page: i, text: pageText });
          }

          // Generate thumbnail from page 1
          try {
            const page = await pdf.getPage(1);
            const thumbScale = 240 / page.getViewport({ scale: 1 }).width;
            const viewport = page.getViewport({ scale: thumbScale });
            const thumbCanvas = document.createElement('canvas');
            thumbCanvas.width = viewport.width;
            thumbCanvas.height = viewport.height;
            const ctx = thumbCanvas.getContext('2d');
            await page.render({ canvasContext: ctx, viewport }).promise;
            thumbnailURL = thumbCanvas.toDataURL('image/jpeg', 0.7);
          } catch (thumbErr) {
            console.warn('Failed to generate PDF thumbnail:', thumbErr);
          }
        } else if (isPPTX) {
          const { PptxRenderer } = await import('pptx-browser');
          const renderer = new PptxRenderer();
          const arrayBuffer = await file.arrayBuffer();
          await renderer.load(arrayBuffer);
          pageCount = renderer.slideCount;

          const allExtracts = await renderer.extractAll();
          allExtracts.forEach(slide => {
            textContent.push({ page: slide.index + 1, text: slide.text || '' });
          });

          // Generate thumbnail from slide 0 (best-effort, non-blocking)
          try {
            const thumbCanvas = document.createElement('canvas');
            await renderer.renderSlide(0, thumbCanvas, 240);
            if (thumbCanvas.width > 0 && thumbCanvas.height > 0) {
              thumbnailURL = thumbCanvas.toDataURL('image/jpeg', 0.7);
            }
          } catch (_) {
            // Thumbnail generation failed — slide renders fine in viewer, skip thumbnail
          }

          renderer.destroy();
        }
      } catch (extractErr) {
        console.warn("Failed to extract text content:", extractErr);
      }

      const metadata = {
        category: 'General',
        pageCount: pageCount,
        thumbnailURL: thumbnailURL,
        uploadedBy: user?.email || 'unknown',
        textContent: textContent
      };

      const result = await uploadMaterial(file, metadata, (p) => {
        setProgress(Math.round(p));
      });

      if (onUploadComplete) {
        onUploadComplete(result);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (err) {
      console.error("Upload failed:", err);

      if (err.code === 'permission_denied' || err.message?.includes('permission')) {
        setError('Upload denied. Please check Supabase Storage permissions.');
      } else if (err.message?.includes('does not exist')) {
        setError('Storage bucket is not configured. Please check Supabase setup.');
      } else if (err.message?.includes('row-level security')) {
        setError('Upload denied by Supabase RLS policy.');
      } else {
        setError('Upload failed: ' + (err.message || 'Unknown error. Check your Supabase/Firebase configuration.'));
      }
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  };

  return (
    <div
      className={`upload-zone ${isDragging ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !isUploading && fileInputRef.current?.click()}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="application/pdf,application/vnd.openxmlformats-officedocument.presentationml.presentation,.pptx"
        style={{ display: 'none' }}
      />

      {isUploading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <i className="material-icons" style={{ fontSize: '48px', marginBottom: '16px', color: 'var(--accent-pink)' }}>cloud_upload</i>
          <h3 className="upload-zone-title" style={{ marginBottom: '16px' }}>Uploading... {progress}%</h3>
          <div className="progress-bar" style={{ maxWidth: '300px', width: '100%', margin: '0 auto' }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
      ) : (
        <>
          <i className="material-icons upload-zone-icon">cloud_upload</i>
          <h3 className="upload-zone-title">Upload new material</h3>
          <p className="upload-zone-text">Drag and drop a PDF or PPTX, or <strong>Browse files</strong></p>
        </>
      )}

      {error && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          background: 'var(--color-danger-light)',
          color: 'var(--color-danger)',
          borderRadius: 'var(--radius-md)',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}
