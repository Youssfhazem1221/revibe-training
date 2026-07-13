'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import * as pdfjsLib from 'pdfjs-dist';
import * as fabric from 'fabric';
import { saveAnnotation, getAnnotationsForMaterial } from '@/lib/materials';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ─── PPTX Editor: not supported — redirect to viewer ─────────────────────────
function PPTXEditorPlaceholder({ title, materialId, router }) {
  return (
    <div className="editor-page">
      <div className="editor-banner">
        <i className="material-icons editor-banner-icon">co_present</i>
        <span className="editor-banner-text">PPTX PRESENTATION</span>
      </div>

      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button className="viewer-back-btn" onClick={() => router.push(`/viewer?id=${materialId}`)}>
            <i className="material-icons">close</i> Exit Editor
          </button>
          <div className="viewer-doc-title" title={title}>{title || 'Presentation'}</div>
        </div>
      </div>

      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        padding: '48px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px', height: '80px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, var(--accent-pink), var(--accent-purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 32px rgba(255,46,99,0.3)'
        }}>
          <i className="material-icons" style={{ fontSize: '40px', color: 'white' }}>co_present</i>
        </div>

        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
            PPTX Annotation Coming Soon
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', maxWidth: '400px', lineHeight: '1.6' }}>
            Annotating PowerPoint files directly isn&apos;t supported yet.
            View the presentation in the full-featured viewer powered by Microsoft Office Online.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <button
            className="btn btn-gradient"
            onClick={() => router.push(`/viewer?id=${materialId}`)}
          >
            <i className="material-icons" style={{ fontSize: '16px' }}>visibility</i>
            Open in Viewer
          </button>
          <button
            className="btn btn-outline"
            onClick={() => router.push('/dashboard')}
          >
            <i className="material-icons" style={{ fontSize: '16px' }}>dashboard</i>
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PDF Editor ───────────────────────────────────────────────────────────────
export default function PDFEditor({ url, title, materialId }) {
  const router = useRouter();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [activeTool, setActiveTool] = useState('select');
  const [brushColor, setBrushColor] = useState('#FF2E63');
  const [brushWidth, setBrushWidth] = useState(2);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isPageRendering, setIsPageRendering] = useState(false);

  const pdfCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricObjRef = useRef(null);
  const renderTaskRef = useRef(null);

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
      } catch (err) {
        console.error('Error loading PDF:', err);
      }
    };

    loadDoc();
  }, [url, isPPTX]);

  // ── Render PDF Page + init Fabric ───────────────────────────────────────────
  const renderPage = useCallback(async (num) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !fabricCanvasRef.current || !pdfDoc) return;

    setIsPageRendering(true);

    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch (_) {}
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

      const logicalWidth = viewport.width / dpr;
      const logicalHeight = viewport.height / dpr;

      // Initialize or resize Fabric canvas
      if (!fabricObjRef.current) {
        fabricObjRef.current = new fabric.Canvas(fabricCanvasRef.current, {
          width: logicalWidth,
          height: logicalHeight,
          isDrawingMode: false
        });
        fabricObjRef.current.on('object:modified', () => setSaveStatus('unsaved'));
        fabricObjRef.current.on('object:added', () => setSaveStatus('unsaved'));
        fabricObjRef.current.on('object:removed', () => setSaveStatus('unsaved'));
      } else {
        fabricObjRef.current.setDimensions({ width: logicalWidth, height: logicalHeight });
        fabricObjRef.current.clear();
      }

      // Load existing annotations
      const annotations = await getAnnotationsForMaterial(materialId);
      const pageAnn = annotations.find(a => a.pageNumber === num);
      if (pageAnn && pageAnn.fabricJSON) {
        fabricObjRef.current.loadFromJSON(pageAnn.fabricJSON, () => {
          fabricObjRef.current.renderAll();
          setSaveStatus('saved');
        });
      }
    } catch (error) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    } finally {
      setIsPageRendering(false);
    }
  }, [pdfDoc, scale, materialId]);

  useEffect(() => {
    if (isPPTX) return;
    const id = requestAnimationFrame(() => renderPage(pageNum));
    return () => cancelAnimationFrame(id);
  }, [pageNum, renderPage, isPPTX]);

  // ── Cleanup Fabric canvas on unmount ───────────────────────────────────────
  useEffect(() => {
    return () => {
      if (fabricObjRef.current) {
        fabricObjRef.current.dispose();
        fabricObjRef.current = null;
      }
    };
  }, []);

  // ── Tool Selection ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fabricObjRef.current) return;
    const fCanvas = fabricObjRef.current;
    fCanvas.isDrawingMode = activeTool === 'draw';
    if (activeTool === 'draw') {
      fCanvas.freeDrawingBrush.color = brushColor;
      fCanvas.freeDrawingBrush.width = brushWidth;
    }
    if (activeTool !== 'select') {
      fCanvas.discardActiveObject();
      fCanvas.requestRenderAll();
    }
  }, [activeTool, brushColor, brushWidth]);

  // ── Add Elements ────────────────────────────────────────────────────────────
  const addText = () => {
    if (!fabricObjRef.current) return;
    const text = new fabric.IText('Double click to edit', {
      left: 100, top: 100,
      fontFamily: 'Inter',
      fill: brushColor,
      fontSize: 24 * scale
    });
    fabricObjRef.current.add(text);
    fabricObjRef.current.setActiveObject(text);
    setActiveTool('select');
  };

  const addRect = () => {
    if (!fabricObjRef.current) return;
    const rect = new fabric.Rect({
      left: 100, top: 100,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: brushWidth,
      width: 100 * scale,
      height: 100 * scale
    });
    fabricObjRef.current.add(rect);
    setActiveTool('select');
  };

  const deleteSelected = () => {
    if (!fabricObjRef.current) return;
    const activeObjects = fabricObjRef.current.getActiveObjects();
    if (activeObjects.length) {
      fabricObjRef.current.discardActiveObject();
      activeObjects.forEach(obj => fabricObjRef.current.remove(obj));
    }
  };

  const handleSave = async () => {
    if (!fabricObjRef.current) return;
    setSaveStatus('saving');
    try {
      const json = JSON.stringify(fabricObjRef.current.toJSON());
      await saveAnnotation(materialId, pageNum, json);
      setSaveStatus('saved');
    } catch (e) {
      console.error('Failed to save', e);
      setSaveStatus('unsaved');
      alert('Failed to save annotations');
    }
  };

  // ── PPTX: show placeholder ──────────────────────────────────────────────────
  if (isPPTX) {
    return <PPTXEditorPlaceholder title={title} materialId={materialId} router={router} />;
  }

  // ── PDF Editor UI ───────────────────────────────────────────────────────────
  return (
    <div className="editor-page">
      {/* Banner */}
      <div className="editor-banner">
        <i className="material-icons editor-banner-icon">science</i>
        <span className="editor-banner-text">EXPERIMENTAL PDF EDITOR</span>
        <span className="editor-banner-badge">Beta</span>
      </div>

      {/* Toolbar */}
      <div className="editor-toolbar">
        <div className="editor-toolbar-left">
          <button className="viewer-back-btn" onClick={() => router.push(`/viewer?id=${materialId}`)}>
            <i className="material-icons">close</i> Exit Editor
          </button>
          <div className="viewer-doc-title" title={title}>{title || 'Document'}</div>
        </div>

        <div className="editor-toolbar-center">
          <div className="viewer-page-nav">
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPageNum(p => Math.max(1, p - 1))} disabled={pageNum <= 1}>
              <i className="material-icons">chevron_left</i>
            </button>
            <div className="viewer-page-input">{pageNum}</div>
            <span className="viewer-page-total">/ {numPages}</span>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={() => setPageNum(p => Math.min(numPages, p + 1))} disabled={pageNum >= numPages}>
              <i className="material-icons">chevron_right</i>
            </button>
          </div>
        </div>

        <div className="editor-toolbar-right">
          <div className={`editor-save-status ${saveStatus}`}>
            <i className="material-icons">
              {saveStatus === 'saved' ? 'cloud_done' : saveStatus === 'saving' ? 'sync' : 'cloud_off'}
            </i>
            {saveStatus === 'saved' ? 'Saved' : saveStatus === 'saving' ? 'Saving...' : 'Unsaved changes'}
          </div>
          <button className="btn btn-gradient btn-sm" onClick={handleSave}>
            <i className="material-icons" style={{ fontSize: '16px' }}>save</i> Save Page
          </button>
        </div>
      </div>

      <div className="editor-body">
        {/* Tools Panel */}
        <div className="editor-tools">
          <div className={`tool-btn ${activeTool === 'select' ? 'active' : ''}`} onClick={() => setActiveTool('select')} title="Select & Move">
            <i className="material-icons">near_me</i>
            <span className="tool-btn-label">Select</span>
          </div>
          <div className="tool-divider" />
          <div className="tool-btn" onClick={addText} title="Add Text">
            <i className="material-icons">title</i>
            <span className="tool-btn-label">Text</span>
          </div>
          <div className={`tool-btn ${activeTool === 'draw' ? 'active' : ''}`} onClick={() => setActiveTool('draw')} title="Draw">
            <i className="material-icons">edit</i>
            <span className="tool-btn-label">Draw</span>
          </div>
          <div className="tool-btn" onClick={addRect} title="Rectangle">
            <i className="material-icons">check_box_outline_blank</i>
            <span className="tool-btn-label">Shape</span>
          </div>
          <div className="tool-divider" />
          <div className="tool-btn" onClick={deleteSelected} title="Delete Selected">
            <i className="material-icons text-color-danger">delete</i>
            <span className="tool-btn-label">Erase</span>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="editor-canvas-area" style={{ position: 'relative' }}>
          {isPageRendering && (
            <div style={{
              position: 'absolute', inset: 0,
              backgroundColor: 'rgba(255,255,255,0.7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, backdropFilter: 'blur(2px)'
            }}>
              <i className="material-icons animate-spin text-accent-pink" style={{ fontSize: '48px' }}>refresh</i>
            </div>
          )}
          <div className="editor-canvas-wrapper">
            <canvas ref={pdfCanvasRef} className="editor-pdf-canvas" />
            <div className="editor-fabric-canvas">
              <canvas ref={fabricCanvasRef} />
            </div>
          </div>
        </div>

        {/* Properties Panel */}
        <div className="editor-properties">
          <div className="properties-header">Properties</div>
          <div className="properties-section">
            <div className="properties-section-title">Color</div>
            <div className="property-row">
              <input
                type="color"
                className="property-color-input"
                value={brushColor}
                onChange={(e) => {
                  setBrushColor(e.target.value);
                  if (fabricObjRef.current?.getActiveObject()) {
                    const obj = fabricObjRef.current.getActiveObject();
                    if (obj.type === 'i-text') obj.set('fill', e.target.value);
                    else obj.set('stroke', e.target.value);
                    fabricObjRef.current.requestRenderAll();
                    setSaveStatus('unsaved');
                  }
                }}
              />
              <span className="font-mono text-small">{brushColor}</span>
            </div>
          </div>
          {activeTool === 'draw' && (
            <div className="properties-section">
              <div className="properties-section-title">Thickness</div>
              <input
                type="range" min="1" max="20"
                value={brushWidth}
                onChange={(e) => setBrushWidth(parseInt(e.target.value))}
                className="property-slider"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
