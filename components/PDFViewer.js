'use client';

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { recordPageView, isMaterialCompleted } from '@/lib/progress';
import { getUserMaterialFeedback } from '@/lib/feedback';
import FeedbackModal from './FeedbackModal';
import * as pdfjsLib from 'pdfjs-dist';

// We need to set the worker path to match the pdfjs-dist version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── PPTX Viewer via PowerPoint Live Embed ──────────────────────────────────
function PPTXViewer({ url, title, numPages, materialId, isTrainer, router }) {
  // Force a standard widescreen 16:9 horizontal aspect ratio to match our screen layout
  const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}&wdAr=1.7777777777777777`;
  const [iframeLoaded, setIframeLoaded] = useState(false);

  return (
    <div className="pptx-viewer-wrapper" style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      {/* PPTX Toolbar */}
      <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <button className="viewer-back-btn" onClick={() => router.push('/dashboard')}>
            <i className="material-icons">arrow_back</i> Back
          </button>
          <div className="viewer-doc-title" title={title}>{title || 'Presentation'}</div>
        </div>

        <div className="viewer-toolbar-center">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <i className="material-icons" style={{ fontSize: '18px', color: 'var(--accent-pink)' }}>co_present</i>
            <span>{numPages} slides • Powered by PowerPoint Live</span>
          </div>
        </div>

        <div className="viewer-toolbar-right">
          <a
            href={url}
            download
            className="btn btn-ghost btn-icon"
            title="Download PPTX"
          >
            <i className="material-icons">download</i>
          </a>
          <a
            href={`https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-icon"
            title="Open in full screen"
          >
            <i className="material-icons">open_in_new</i>
          </a>
          {isTrainer && (
            <button
              className="btn btn-outline-pink btn-sm"
              onClick={() => router.push(`/editor?id=${materialId}`)}
            >
              <i className="material-icons" style={{ fontSize: '16px' }}>edit</i> Open in Editor
            </button>
          )}
        </div>
      </div>

      {/* Office Online iframe styled as centered 16:9 horizontal slideshow */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#111827', // Premium dark presentation backdrop
        padding: '24px',
        overflow: 'hidden'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1100px', // Standard horizontal presentation screen width
          aspectRatio: '16/9', // Absolute 16:9 Horizontal Slideshow ratio
          background: 'var(--bg-white)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
          borderRadius: '8px',
          overflow: 'hidden',
          position: 'relative'
        }}>
          {!iframeLoaded && (
            <div style={{
              position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '16px',
              background: 'var(--bg-white)', zIndex: 2
            }}>
              <i className="material-icons animate-spin text-accent-pink" style={{ fontSize: '48px' }}>refresh</i>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading presentation via PowerPoint Live…</p>
            </div>
          )}
          <iframe
            src={officeViewerUrl}
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              display: 'block',
              imageRendering: 'crisp-edges',
              transform: 'translateZ(0)',
              backfaceVisibility: 'hidden'
            }}
            title={title}
            onLoad={() => setIframeLoaded(true)}
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main PDFViewer ──────────────────────────────────────────────────────────
export default function PDFViewer({ url, title, materialId, isTrainer, textContent = [], pageCount = 0 }) {
  const router = useRouter();
  const { user } = useAuth();
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [presentationMode, setPresentationMode] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playInterval, setPlayInterval] = useState(5); // Default 5 seconds
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [hasShownFeedbackModal, setHasShownFeedbackModal] = useState(false);

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);
  const pageInputRef = useRef(null);
  const searchInputRef = useRef(null);
  const progressTimerRef = useRef(null);

  const isPPTX = url?.toLowerCase().includes('.pptx');

  // ── Load PDF ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!url || isPPTX) return;

    const loadDoc = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
      } catch (error) {
        console.error('Error loading PDF:', error);
      }
    };

    loadDoc();
  }, [url, isPPTX]);

  // ── Slideshow Auto-Advance Effect ───────────────────────────────────────────
  useEffect(() => {
    let timer;
    if (isPlaying && numPages > 0) {
      timer = setInterval(() => {
        setPageNum(p => (p >= numPages ? 1 : p + 1));
      }, playInterval * 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, playInterval, numPages]);

  // ── Render PDF Page ──────────────────────────────────────────────────────────
  const renderPage = useCallback(async (num) => {
    const canvas = canvasRef.current;
    if (!canvas || !pdfDoc) return;

    setIsPageRendering(true);

    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch (_) { }
    }

    try {
      const page = await pdfDoc.getPage(num);
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: scale * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      await renderTaskRef.current.promise;
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    } finally {
      setIsPageRendering(false);
    }
  }, [pdfDoc, scale]);

  useEffect(() => {
    const id = requestAnimationFrame(() => renderPage(pageNum));
    return () => cancelAnimationFrame(id);
  }, [pageNum, renderPage]);

  // ── Track Progress (Debounced) ──────────────────────────────────────────────
  useEffect(() => {
    // Only track progress for authenticated users with valid material data
    if (!user || !materialId || !numPages || numPages === 0) return;

    // Clear any existing timer
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
    }

    // Debounce progress tracking by 2 seconds to avoid excessive Firestore writes
    progressTimerRef.current = setTimeout(async () => {
      try {
        await recordPageView(user.uid, materialId, pageNum, numPages, title || 'Untitled');
        
        // Check if user just completed the material (haven't shown modal yet this session)
        if (!hasShownFeedbackModal) {
          const completed = await isMaterialCompleted(user.uid, materialId);
          if (completed) {
            // Check if user has already submitted feedback
            const existingFeedback = await getUserMaterialFeedback(user.uid, materialId);
            // Only show modal if no feedback exists yet
            if (!existingFeedback) {
              setShowFeedbackModal(true);
              setHasShownFeedbackModal(true);
            }
          }
        }
      } catch (error) {
        console.warn('Failed to record page view:', error);
        // Silent fail - don't interrupt user experience
      }
    }, 2000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, [user, materialId, pageNum, numPages, title, hasShownFeedbackModal]);

  // ── Search ──────────────────────────────────────────────────────────────────
  const searchMatches = useMemo(() => {
    if (searchQuery.trim() === '' || !textContent) return [];
    const q = searchQuery.toLowerCase();
    return textContent
      .filter(p => p.text.toLowerCase().includes(q))
      .map(p => p.page);
  }, [searchQuery, textContent]);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setCurrentMatchIndex(0);
      if (searchMatches.length > 0) setPageNum(searchMatches[0]);
    });
    return () => cancelAnimationFrame(id);
  }, [searchMatches]);

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    setPageNum(searchMatches[next]);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    setPageNum(searchMatches[prev]);
  };

  // ── Keyboard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
        return;
      }
      if (e.key === 'Escape' && isSearchOpen) { setIsSearchOpen(false); return; }
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setPageNum(p => Math.min(numPages, p + 1)); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setPageNum(p => Math.max(1, p - 1)); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, numPages]);

  const changePage = (offset) => setPageNum(p => {
    const n = p + offset;
    return n >= 1 && n <= numPages ? n : p;
  });

  const handlePageSubmit = (e) => {
    e.preventDefault();
    const num = parseInt(pageInputRef.current.value);
    if (num >= 1 && num <= numPages) setPageNum(num);
    else pageInputRef.current.value = pageNum;
  };

  // ── PPTX → Google Docs Viewer ──────────────────────────────────────────────
  if (isPPTX) {
    return (
      <div className={`viewer-page ${presentationMode ? 'presentation-mode' : ''}`} style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        <PPTXViewer
          url={url}
          title={title}
          numPages={pageCount}
          materialId={materialId}
          isTrainer={isTrainer}
          router={router}
        />
      </div>
    );
  }

  // ── PDF Viewer ──────────────────────────────────────────────────────────────
  return (
    <>
      <div className={`viewer-page ${presentationMode ? 'presentation-mode' : ''}`}>
        {/* Toolbar */}
        <div className="viewer-toolbar">
        <div className="viewer-toolbar-left">
          <button className="viewer-back-btn" onClick={() => router.push('/dashboard')}>
            <i className="material-icons">arrow_back</i> Back
          </button>
          <div className="viewer-doc-title" title={title}>{title || 'Document'}</div>
        </div>

        <div className="viewer-toolbar-center">
          <div className="viewer-page-nav">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => changePage(-1)} disabled={pageNum <= 1}>
              <i className="material-icons">chevron_left</i>
            </button>
            <form onSubmit={handlePageSubmit}>
              <input
                type="number"
                className="viewer-page-input"
                defaultValue={pageNum}
                key={pageNum}
                ref={pageInputRef}
                min="1"
                max={numPages}
              />
            </form>
            <span className="viewer-page-total">/ {numPages}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => changePage(1)} disabled={pageNum >= numPages}>
              <i className="material-icons">chevron_right</i>
            </button>
          </div>

          <div className="viewer-zoom-controls">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setScale(s => Math.max(0.5, s - 0.25))}>
              <i className="material-icons">remove</i>
            </button>
            <div className="viewer-zoom-level">{Math.round(scale * 100)}%</div>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setScale(s => Math.min(3.0, s + 0.25))}>
              <i className="material-icons">add</i>
            </button>
          </div>
        </div>

        <div className="viewer-toolbar-right">
          {/* Slideshow Auto-Play Controls */}
          <div className="viewer-slideshow-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(255, 255, 255, 0.05)', padding: '2px 8px', borderRadius: '16px', marginRight: '8px' }}>
            <button
              className={`btn btn-ghost btn-sm ${isPlaying ? 'text-accent-pink' : ''}`}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: 'auto', padding: '4px' }}
              onClick={() => setIsPlaying(!isPlaying)}
              title={isPlaying ? 'Pause Slideshow' : 'Start Slideshow'}
            >
              <i className="material-icons" style={{ fontSize: '18px' }}>{isPlaying ? 'pause' : 'play_arrow'}</i>
            </button>
            <select
              value={playInterval}
              onChange={(e) => setPlayInterval(Number(e.target.value))}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '12px',
                fontWeight: '600',
                outline: 'none',
                cursor: 'pointer',
                paddingRight: '4px',
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none'
              }}
              title="Slide Duration"
            >
              <option value="3" style={{ background: 'var(--bg-white)', color: 'black' }}>3s</option>
              <option value="5" style={{ background: 'var(--bg-white)', color: 'black' }}>5s</option>
              <option value="10" style={{ background: 'var(--bg-white)', color: 'black' }}>10s</option>
            </select>
          </div>
          <button
            className={`btn ${presentationMode ? 'btn-primary' : 'btn-ghost'} btn-icon`}
            onClick={() => { setPresentationMode(!presentationMode); setScale(!presentationMode ? 1.5 : 1.0); }}
            title="Presentation Mode"
          >
            <i className="material-icons">{presentationMode ? 'fullscreen_exit' : 'slideshow'}</i>
          </button>
          <button
            className={`btn ${isSearchOpen ? 'btn-primary' : 'btn-ghost'} btn-icon`}
            onClick={() => { setIsSearchOpen(!isSearchOpen); if (!isSearchOpen) setTimeout(() => searchInputRef.current?.focus(), 100); }}
            title="Search (Ctrl+F)"
          >
            <i className="material-icons">search</i>
          </button>
          {isTrainer && (
            <button
              className="btn btn-outline-pink btn-sm"
              onClick={() => router.push(`/editor?id=${materialId}`)}
            >
              <i className="material-icons" style={{ fontSize: '16px' }}>edit</i> Open in Editor
            </button>
          )}
        </div>
      </div>

      <div className="viewer-body">
        {/* Search Overlay */}
        <div className={`viewer-search-overlay ${isSearchOpen ? 'active' : ''}`}>
          <i className="material-icons text-accent-pink">search</i>
          <input
            type="text"
            className="viewer-search-input"
            placeholder="Find in document..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            ref={searchInputRef}
          />
          {searchMatches.length > 0 && (
            <div className="viewer-search-nav">
              <button className="btn btn-ghost btn-icon btn-sm" onClick={handlePrevMatch}>
                <i className="material-icons">keyboard_arrow_up</i>
              </button>
              <button className="btn btn-ghost btn-icon btn-sm" onClick={handleNextMatch}>
                <i className="material-icons">keyboard_arrow_down</i>
              </button>
            </div>
          )}
          <div className="viewer-search-count text-muted">
            {searchQuery.trim() === '' ? '' : searchMatches.length > 0 ? `${currentMatchIndex + 1} of ${searchMatches.length}` : 'No matches'}
          </div>
          <button className="btn btn-ghost btn-icon" onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }}>
            <i className="material-icons">close</i>
          </button>
        </div>

        {/* Canvas */}
        <div className="viewer-main">
          {pdfDoc ? (
            <div className="viewer-page-wrapper" style={{ position: 'relative' }}>
              {isPageRendering && (
                <div style={{
                  position: 'absolute', inset: 0, backgroundColor: 'rgba(255,255,255,0.7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  zIndex: 5, backdropFilter: 'blur(2px)'
                }}>
                  <i className="material-icons animate-spin text-accent-pink" style={{ fontSize: '48px' }}>refresh</i>
                </div>
              )}
              <canvas ref={canvasRef} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted" style={{ margin: 'auto' }}>
              <i className="material-icons animate-spin text-accent-pink mb-4" style={{ fontSize: '48px' }}>refresh</i>
              <p className="font-semibold text-muted">Loading presentation and rendering slides at 1:1 crisp quality...</p>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Feedback Modal */}
      <FeedbackModal
        materialId={materialId}
        materialName={title || 'Untitled'}
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        onSubmitSuccess={() => {
          console.log('Feedback submitted successfully');
        }}
      />
    </>
  );
}
