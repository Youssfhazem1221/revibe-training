'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import * as pdfjsLib from 'pdfjs-dist';
import * as fabric from 'fabric';
import { saveAnnotation, getAnnotationsForMaterial } from '@/lib/materials';
import { EmptyState, Spinner, useConfirm } from '@/components/ui';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// Annotations are stored in canvas coordinates at this scale, so it must stay
// fixed or previously saved markup would drift out of place.
const RENDER_SCALE = 1.0;

const SWATCHES = [
  { value: '#C82D8C', name: 'Magenta' },
  { value: '#7F19A0', name: 'Purple' },
  { value: '#121212', name: 'Ink' },
  { value: '#FF6400', name: 'Orange' },
  { value: '#12A150', name: 'Green' },
  { value: '#2F6FE4', name: 'Blue' },
  { value: '#FFFFFF', name: 'White' },
];

const TOOLS = [
  { id: 'select', icon: 'near_me', label: 'Select', key: 'V' },
  { id: 'text', icon: 'title', label: 'Text', key: 'T' },
  { id: 'draw', icon: 'draw', label: 'Draw', key: 'D' },
  { id: 'rect', icon: 'crop_square', label: 'Box', key: 'R' },
];

const STATUS = {
  saved: { icon: 'cloud_done', label: 'All changes saved' },
  saving: { icon: 'sync', label: 'Saving…' },
  unsaved: { icon: 'edit_note', label: 'Unsaved changes' },
};

function EditorTopBar({ title, category, materialId, children, onExit }) {
  return (
    <header className="ed-top">
      <div className="ed-top-left">
        {onExit ? (
          <button className="ed-back" onClick={onExit} aria-label="Exit editor and return to the viewer">
            <i className="material-icons">arrow_back</i>
            <span>Viewer</span>
          </button>
        ) : (
          <Link className="ed-back" href={`/viewer?id=${materialId}`} aria-label="Return to the viewer">
            <i className="material-icons">arrow_back</i>
            <span>Viewer</span>
          </Link>
        )}
        <div className="ed-title">
          <span className="ed-eyebrow">
            Annotation editor <span className="badge badge-gradient ed-beta">Beta</span>
            {category && <span className="ed-eyebrow-cat">· {category}</span>}
          </span>
          <span className="ed-name" title={title}>{title || 'Document'}</span>
        </div>
      </div>
      {children}
    </header>
  );
}

// ─── PPTX: annotation isn't supported yet ────────────────────────────────────
function PPTXEditorPlaceholder({ title, category, materialId }) {
  return (
    <div className="ed-page">
      <EditorTopBar title={title} category={category} materialId={materialId} />
      <div className="ed-placeholder">
        <EmptyState
          icon="co_present"
          title="PowerPoint annotation is coming soon"
          text="You can’t draw on .pptx files yet. Export the deck to PDF and re-upload it to annotate, or open it in the viewer."
          action={
            <div className="ed-placeholder-actions">
              <Link href={`/viewer?id=${materialId}`} className="btn btn-gradient">
                <i className="material-icons">visibility</i> Open in viewer
              </Link>
              <Link href="/dashboard" className="btn btn-outline">Back to library</Link>
            </div>
          }
        />
      </div>
    </div>
  );
}

// ─── PDF annotation editor ───────────────────────────────────────────────────
export default function PDFEditor({ url, title, category, materialId }) {
  const router = useRouter();
  const confirm = useConfirm();

  const [pdfDoc, setPdfDoc] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [activeTool, setActiveTool] = useState('select');
  const [brushColor, setBrushColor] = useState(SWATCHES[0].value);
  const [brushWidth, setBrushWidth] = useState(3);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [isPageRendering, setIsPageRendering] = useState(false);
  const [hasSelection, setHasSelection] = useState(false);

  const pdfCanvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const fabricObjRef = useRef(null);
  const renderTaskRef = useRef(null);
  const loadingAnnotationsRef = useRef(false); // suppress "unsaved" while (re)loading a page
  const statusRef = useRef('saved');
  const pageNumRef = useRef(1);

  const isPPTX = url?.toLowerCase().includes('.pptx');

  const updateStatus = useCallback((s) => {
    statusRef.current = s;
    setSaveStatus(s);
  }, []);

  // ── Load PDF ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!url || isPPTX) return;
    let cancelled = false;
    pdfjsLib.getDocument(url).promise
      .then((pdf) => {
        if (cancelled) return;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);
        setPageNum(1);
      })
      .catch((err) => {
        console.error('Error loading PDF:', err);
        if (!cancelled) setLoadError(true);
      });
    return () => { cancelled = true; };
  }, [url, isPPTX]);

  // ── Render PDF page + (re)initialise Fabric with that page's annotations ───
  const renderPage = useCallback(async (num) => {
    const canvas = pdfCanvasRef.current;
    if (!canvas || !fabricCanvasRef.current || !pdfDoc) return;
    setIsPageRendering(true);

    if (renderTaskRef.current) {
      try { await renderTaskRef.current.cancel(); } catch (_) { /* already done */ }
    }

    try {
      const page = await pdfDoc.getPage(num);
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const viewport = page.getViewport({ scale: RENDER_SCALE * dpr });

      canvas.width = viewport.width;
      canvas.height = viewport.height;
      canvas.style.width = `${viewport.width / dpr}px`;
      canvas.style.height = `${viewport.height / dpr}px`;

      renderTaskRef.current = page.render({ canvasContext: ctx, viewport });
      await renderTaskRef.current.promise;

      const logicalWidth = viewport.width / dpr;
      const logicalHeight = viewport.height / dpr;
      const markDirty = () => { if (!loadingAnnotationsRef.current) updateStatus('unsaved'); };
      const syncSelection = () => setHasSelection(!!fabricObjRef.current?.getActiveObject());

      loadingAnnotationsRef.current = true;
      if (!fabricObjRef.current) {
        fabricObjRef.current = new fabric.Canvas(fabricCanvasRef.current, {
          width: logicalWidth,
          height: logicalHeight,
          isDrawingMode: false,
        });
        fabricObjRef.current.on('object:modified', markDirty);
        fabricObjRef.current.on('object:added', markDirty);
        fabricObjRef.current.on('object:removed', markDirty);
        fabricObjRef.current.on('selection:created', syncSelection);
        fabricObjRef.current.on('selection:updated', syncSelection);
        fabricObjRef.current.on('selection:cleared', syncSelection);
      } else {
        fabricObjRef.current.setDimensions({ width: logicalWidth, height: logicalHeight });
        fabricObjRef.current.clear();
      }

      // Fabric 7: loadFromJSON is promise-based (the 2nd arg is a per-object reviver).
      const annotations = await getAnnotationsForMaterial(materialId);
      const pageAnn = annotations.find((a) => a.pageNumber === num);
      if (pageAnn?.fabricJSON) {
        await fabricObjRef.current.loadFromJSON(pageAnn.fabricJSON);
        fabricObjRef.current.requestRenderAll();
      }
      updateStatus('saved');
    } catch (error) {
      if (error?.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
        toast.error('Couldn’t load this slide. Try again.');
      }
    } finally {
      loadingAnnotationsRef.current = false;
      setIsPageRendering(false);
      setHasSelection(false);
    }
  }, [pdfDoc, materialId, updateStatus]);

  useEffect(() => {
    if (isPPTX) return;
    pageNumRef.current = pageNum;
    const id = requestAnimationFrame(() => renderPage(pageNum));
    return () => cancelAnimationFrame(id);
  }, [pageNum, renderPage, isPPTX]);

  useEffect(() => () => {
    fabricObjRef.current?.dispose();
    fabricObjRef.current = null;
  }, []);

  // ── Tools ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fCanvas = fabricObjRef.current;
    if (!fCanvas) return;
    fCanvas.isDrawingMode = activeTool === 'draw';
    if (activeTool === 'draw') {
      if (!fCanvas.freeDrawingBrush) fCanvas.freeDrawingBrush = new fabric.PencilBrush(fCanvas);
      fCanvas.freeDrawingBrush.color = brushColor;
      fCanvas.freeDrawingBrush.width = brushWidth;
    }
    if (activeTool !== 'select') {
      fCanvas.discardActiveObject();
      fCanvas.requestRenderAll();
    }
  }, [activeTool, brushColor, brushWidth, pdfDoc]);

  const addText = useCallback(() => {
    const fCanvas = fabricObjRef.current;
    if (!fCanvas) return;
    const text = new fabric.IText('Double-click to edit', {
      left: 80, top: 80,
      fontFamily: 'Montserrat, Arial, sans-serif',
      fontWeight: 600,
      fill: brushColor,
      fontSize: 24 * RENDER_SCALE,
    });
    fCanvas.add(text);
    fCanvas.setActiveObject(text);
    setActiveTool('select');
  }, [brushColor]);

  const addRect = useCallback(() => {
    const fCanvas = fabricObjRef.current;
    if (!fCanvas) return;
    const rect = new fabric.Rect({
      left: 80, top: 80,
      fill: 'transparent',
      stroke: brushColor,
      strokeWidth: brushWidth,
      rx: 6, ry: 6,
      width: 140 * RENDER_SCALE,
      height: 90 * RENDER_SCALE,
    });
    fCanvas.add(rect);
    fCanvas.setActiveObject(rect);
    setActiveTool('select');
  }, [brushColor, brushWidth]);

  const chooseTool = useCallback((id) => {
    if (id === 'text') return addText();
    if (id === 'rect') return addRect();
    setActiveTool(id);
  }, [addText, addRect]);

  const deleteSelected = useCallback(() => {
    const fCanvas = fabricObjRef.current;
    if (!fCanvas) return;
    const active = fCanvas.getActiveObjects();
    if (!active.length) return;
    fCanvas.discardActiveObject();
    active.forEach((obj) => fCanvas.remove(obj));
    fCanvas.requestRenderAll();
  }, []);

  const applyColor = (value) => {
    setBrushColor(value);
    const fCanvas = fabricObjRef.current;
    const obj = fCanvas?.getActiveObject();
    if (obj) {
      if (obj.type === 'i-text' || obj.type === 'text') obj.set('fill', value);
      else obj.set('stroke', value);
      fCanvas.requestRenderAll();
      updateStatus('unsaved');
    }
  };

  // ── Saving ──────────────────────────────────────────────────────────────────
  const save = useCallback(async ({ silent = false } = {}) => {
    const fCanvas = fabricObjRef.current;
    if (!fCanvas) return true;
    updateStatus('saving');
    try {
      await saveAnnotation(materialId, pageNumRef.current, JSON.stringify(fCanvas.toJSON()));
      updateStatus('saved');
      if (!silent) toast.success(`Slide ${pageNumRef.current} saved`);
      return true;
    } catch (e) {
      console.error('Failed to save', e);
      updateStatus('unsaved');
      toast.error('Couldn’t save your annotations. Check your connection and try again.');
      return false;
    }
  }, [materialId, updateStatus]);

  // Changing slide auto-saves first, so markup is never silently lost.
  const goToPage = useCallback(async (next) => {
    if (next < 1 || next > numPages || next === pageNumRef.current || isPageRendering) return;
    if (statusRef.current === 'unsaved') {
      const ok = await save({ silent: true });
      if (!ok) return;
    }
    setPageNum(next);
  }, [numPages, isPageRendering, save]);

  const exitEditor = useCallback(async () => {
    if (statusRef.current === 'unsaved') {
      const saved = await save({ silent: true });
      if (!saved) {
        const leave = await confirm({
          title: 'Leave without saving?',
          body: 'Your latest annotations on this slide couldn’t be saved and will be lost.',
          confirmLabel: 'Leave anyway',
          tone: 'danger',
        });
        if (!leave) return;
      }
    }
    router.push(`/viewer?id=${materialId}`);
  }, [save, confirm, router, materialId]);

  // Warn before closing the tab with unsaved work.
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (statusRef.current !== 'unsaved') return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      const editingText = fabricObjRef.current?.getActiveObject()?.isEditing;
      const inField = e.target?.closest?.('input, textarea, select, [contenteditable="true"]');
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        save();
        return;
      }
      if (editingText || inField || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
      if (e.key === 'PageDown') { e.preventDefault(); goToPage(pageNumRef.current + 1); return; }
      if (e.key === 'PageUp') { e.preventDefault(); goToPage(pageNumRef.current - 1); return; }
      const tool = TOOLS.find((t) => t.key.toLowerCase() === e.key.toLowerCase());
      if (tool) { e.preventDefault(); chooseTool(tool.id); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [save, deleteSelected, goToPage, chooseTool]);

  if (isPPTX) {
    return <PPTXEditorPlaceholder title={title} category={category} materialId={materialId} />;
  }

  if (loadError) {
    return (
      <div className="ed-page">
        <EditorTopBar title={title} category={category} materialId={materialId} />
        <div className="ed-placeholder">
          <EmptyState
            icon="cloud_off"
            title="This file didn’t open"
            text="The PDF couldn’t be downloaded. Try again in a moment, or replace the file from the library."
            action={<Link href="/dashboard" className="btn btn-gradient">Back to library</Link>}
          />
        </div>
      </div>
    );
  }

  const status = STATUS[saveStatus];

  return (
    <div className="ed-page">
      <EditorTopBar title={title} category={category} materialId={materialId} onExit={exitEditor}>
        <div className="ed-pager" role="group" aria-label="Slides">
          <button className="ed-icon-btn" onClick={() => goToPage(pageNum - 1)} disabled={pageNum <= 1 || !pdfDoc} aria-label="Previous slide" title="Previous slide (Page Up)">
            <i className="material-icons">chevron_left</i>
          </button>
          <span className="ed-pager-count tabular" aria-live="polite">
            {pdfDoc ? <><strong>{pageNum}</strong> / {numPages}</> : '–'}
          </span>
          <button className="ed-icon-btn" onClick={() => goToPage(pageNum + 1)} disabled={pageNum >= numPages || !pdfDoc} aria-label="Next slide" title="Next slide (Page Down)">
            <i className="material-icons">chevron_right</i>
          </button>
        </div>

        <div className="ed-top-right">
          <span className={`ed-status ${saveStatus}`} role="status">
            <i className={`material-icons ${saveStatus === 'saving' ? 'animate-spin' : ''}`}>{status.icon}</i>
            <span>{status.label}</span>
          </span>
          <button className="btn btn-gradient btn-sm" onClick={() => save()} disabled={saveStatus === 'saving' || !pdfDoc} title="Save this slide (Ctrl+S)">
            <i className="material-icons">save</i> <span className="ed-save-label">Save</span>
          </button>
        </div>
      </EditorTopBar>

      <div className="ed-body">
        <nav className="ed-tools" aria-label="Annotation tools">
          {TOOLS.map((tool) => {
            const momentary = tool.id === 'text' || tool.id === 'rect';
            const isActive = !momentary && activeTool === tool.id;
            return (
              <button
                key={tool.id}
                className={`ed-tool ${isActive ? 'active' : ''}`}
                onClick={() => chooseTool(tool.id)}
                aria-pressed={momentary ? undefined : isActive}
                aria-label={momentary ? `Add ${tool.label.toLowerCase()}` : tool.label}
                title={`${momentary ? 'Add ' + tool.label.toLowerCase() : tool.label} (${tool.key})`}
                disabled={!pdfDoc}
              >
                <i className="material-icons">{tool.icon}</i>
                <span>{tool.label}</span>
              </button>
            );
          })}
          <span className="ed-tools-sep" aria-hidden="true" />
          <button
            className="ed-tool danger"
            onClick={deleteSelected}
            disabled={!hasSelection}
            aria-label="Delete selected"
            title="Delete selected (Delete)"
          >
            <i className="material-icons">delete_outline</i>
            <span>Delete</span>
          </button>
        </nav>

        <div className="ed-stage">
          {isPageRendering && (
            <div className="ed-rendering" role="status">
              <Spinner size="sm" /> Loading slide
            </div>
          )}
          {!pdfDoc && !loadError && (
            <div className="ed-stage-loading">
              <span className="skeleton ed-stage-skeleton" />
            </div>
          )}
          <div className={`ed-canvas ${pdfDoc ? '' : 'is-hidden'}`}>
            <canvas ref={pdfCanvasRef} className="ed-pdf-canvas" />
            <div className="ed-fabric-canvas">
              <canvas ref={fabricCanvasRef} />
            </div>
          </div>
        </div>

        <aside className="ed-props" aria-label="Style">
          <div className="ed-props-section">
            <span className="ed-props-title">Colour</span>
            <div className="ed-swatches" role="radiogroup" aria-label="Colour">
              {SWATCHES.map((s) => (
                <button
                  key={s.value}
                  className={`ed-swatch ${brushColor.toLowerCase() === s.value.toLowerCase() ? 'active' : ''}`}
                  style={{ '--swatch': s.value }}
                  onClick={() => applyColor(s.value)}
                  role="radio"
                  aria-checked={brushColor.toLowerCase() === s.value.toLowerCase()}
                  aria-label={s.name}
                  title={s.name}
                />
              ))}
              <label className="ed-swatch ed-swatch-custom" title="Custom colour">
                <input type="color" value={brushColor} onChange={(e) => applyColor(e.target.value)} aria-label="Custom colour" />
                <i className="material-icons">colorize</i>
              </label>
            </div>
          </div>

          <div className="ed-props-section">
            <label className="ed-props-title" htmlFor="ed-width">
              Line thickness <span className="tabular">{brushWidth}px</span>
            </label>
            <input
              id="ed-width"
              type="range" min="1" max="20"
              value={brushWidth}
              onChange={(e) => setBrushWidth(parseInt(e.target.value, 10))}
              className="ed-slider"
              style={{ '--fill': `${((brushWidth - 1) / 19) * 100}%` }}
            />
          </div>

          <div className="ed-props-section ed-tips">
            <span className="ed-props-title">Tips</span>
            <p>Changes save per slide. Moving to another slide saves automatically.</p>
            <p><span className="kbd">Ctrl</span> <span className="kbd">S</span> save · <span className="kbd">Del</span> remove · <span className="kbd">V</span> <span className="kbd">T</span> <span className="kbd">D</span> <span className="kbd">R</span> tools</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
