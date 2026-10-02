'use client';

import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';

/** Circular "certified" seal, drawn in SVG so it prints crisply. */
function Seal({ gradientId }) {
  const ringId = `${gradientId}-ring`;
  return (
    <svg className="cert-seal" viewBox="0 0 120 120" role="img" aria-label="Revibe Training certified seal">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#C82D8C" />
          <stop offset="0.55" stopColor="#7F19A0" />
          <stop offset="1" stopColor="#5019A0" />
        </linearGradient>
        <path id={ringId} d="M60,60 m-43,0 a43,43 0 1,1 86,0 a43,43 0 1,1 -86,0" />
      </defs>
      <circle cx="60" cy="60" r="58" fill={`url(#${gradientId})`} />
      <circle cx="60" cy="60" r="53" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1" strokeDasharray="2 3" />
      <text fill="#fff" fontSize="9.2" fontWeight="800" letterSpacing="2.6" fontFamily="Montserrat, Arial, sans-serif">
        <textPath href={`#${ringId}`} startOffset="0">REVIBE TRAINING · CERTIFIED · REVIBE TRAINING · CERTIFIED ·</textPath>
      </text>
      <circle cx="60" cy="60" r="30" fill="#fff" />
      <circle cx="60" cy="60" r="26" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2" />
      <path
        d="M47.5 61.5 l8 8 l17-18"
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Certificate: premium, print-friendly completion certificate in a modal.
 * "Download PDF" / "Print" open the browser print dialog; @media print rules
 * make only the certificate print, on one landscape A4 page.
 */
export default function Certificate({ certificateData, onClose }) {
  const closeRef = useRef(null);
  const rawId = useId();
  const gradientId = `cert-grad-${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`;

  // Focus, Esc to close, scroll lock, focus restore.
  useEffect(() => {
    if (!certificateData) return undefined;
    const previouslyFocused = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
    };
  }, [certificateData, onClose]);

  if (!certificateData || typeof document === 'undefined') return null;

  const { userName, materialName, completedAt, certificateId, issuedBy } = certificateData;

  const handlePrint = () => {
    try {
      // The print dialog uses the page title as the default PDF file name.
      const previousTitle = document.title;
      document.title = `Revibe certificate - ${materialName}`;
      const restore = () => {
        document.title = previousTitle;
        window.removeEventListener('afterprint', restore);
      };
      window.addEventListener('afterprint', restore);
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
      toast.error("Couldn't open the print dialog. Try your browser's Print menu instead.");
    }
  };

  return createPortal(
    <div className="cert-portal">
      <div
        className="cert-backdrop"
        onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div className="cert-dialog" role="dialog" aria-modal="true" aria-labelledby="cert-dialog-title">
          <div className="cert-toolbar">
            <div className="cert-toolbar-text">
              <span className="eyebrow">Well earned</span>
              <h2 id="cert-dialog-title" className="cert-toolbar-title">Your certificate</h2>
            </div>
            <div className="cert-toolbar-actions">
              <button type="button" className="btn btn-outline btn-sm cert-print-btn" onClick={handlePrint}>
                <i className="material-icons" aria-hidden="true">print</i>
                <span>Print</span>
              </button>
              <button type="button" className="btn btn-gradient btn-sm" onClick={handlePrint}>
                <i className="material-icons" aria-hidden="true">download</i>
                <span>Download PDF</span>
              </button>
              <button ref={closeRef} type="button" className="modal-close" onClick={onClose} aria-label="Close certificate">
                <i className="material-icons">close</i>
              </button>
            </div>
          </div>

          <article className="cert-sheet" aria-label={`Certificate of completion for ${userName}`}>
            <div className="cert-inner">
              <span className="cert-blob cert-blob-a" aria-hidden="true" />
              <span className="cert-blob cert-blob-b" aria-hidden="true" />
              <span className="cert-rule" aria-hidden="true" />

              <header className="cert-head">
                <span className="cert-wordmark">
                  <span className="cert-wordmark-logo">REVIBE</span>
                  <span className="cert-wordmark-product">Training</span>
                </span>
                <span className="cert-kicker">Certificate of completion</span>
              </header>

              <div className="cert-main">
                <p className="cert-lead">This certifies that</p>
                <p className="cert-name">{userName}</p>
                <span className="cert-underline" aria-hidden="true" />
                <p className="cert-lead">has successfully completed the training</p>
                <p className="cert-course">{materialName}</p>
              </div>

              <footer className="cert-foot">
                <div className="cert-foot-col">
                  <span className="cert-foot-value">{completedAt}</span>
                  <span className="cert-foot-label">Date completed</span>
                </div>
                <Seal gradientId={gradientId} />
                <div className="cert-foot-col cert-foot-right">
                  <span className="cert-signature">Revibe Training Team</span>
                  <span className="cert-foot-label">{issuedBy || 'Revibe Training Hub'}</span>
                </div>
              </footer>

              {certificateId && (
                <p className="cert-id">
                  Certificate ID <span>{certificateId}</span>
                </p>
              )}
            </div>
          </article>

          <p className="cert-hint">
            <i className="material-icons" aria-hidden="true">info</i>
            To download, choose &ldquo;Save as PDF&rdquo; in the print dialog. It prints on one landscape A4 page.
          </p>
        </div>
      </div>

      <style jsx global>{`
        .cert-backdrop {
          position: fixed;
          inset: 0;
          z-index: calc(var(--z-modal) + 5);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: var(--space-8) var(--space-4);
          overflow-y: auto;
          background: rgba(18, 18, 18, 0.6);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: fadeIn 220ms var(--ease-out) both;
        }
        .cert-dialog {
          width: 100%;
          max-width: 980px;
          margin: auto 0;
          padding: var(--space-5);
          background: var(--bg-white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-xl);
          animation: scaleIn 320ms var(--ease-out) both;
        }
        .cert-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding: 0 var(--space-1) var(--space-4);
        }
        .cert-toolbar-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
        .cert-toolbar-title {
          font-family: var(--font-heading);
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.02em;
          color: var(--text-primary);
        }
        .cert-toolbar-actions { display: flex; align-items: center; gap: var(--space-2); }
        .cert-hint {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-top: var(--space-4);
          font-size: 12.5px;
          color: var(--text-muted);
          text-align: center;
        }
        .cert-hint .material-icons { font-size: 16px; color: var(--brand-purple); }

        /* ---------- The certificate itself (sizes scale with its width) ---------- */
        .cert-sheet {
          container-type: inline-size;
          position: relative;
          width: 100%;
          aspect-ratio: 297 / 210;
          /* % padding resolves against the parent width (= sheet width). */
          padding: 1.1%;
          background: linear-gradient(135deg, #C82D8C 0%, #7F19A0 55%, #5019A0 100%);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-md);
          font-family: var(--font-heading);
          color: #121212;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .cert-inner {
          position: relative;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 4.4cqw 6.5cqw 2.6cqw;
          background: #fff;
          border-radius: 0.6cqw;
          overflow: hidden;
          text-align: center;
        }
        .cert-rule {
          position: absolute;
          inset: 1.5cqw;
          border: 0.12cqw solid #E4D9F2;
          border-radius: 0.4cqw;
          pointer-events: none;
        }
        .cert-blob {
          position: absolute;
          border-radius: 999px;
          pointer-events: none;
        }
        .cert-blob-a {
          width: 34cqw; height: 34cqw; top: -17cqw; right: -12cqw;
          background: radial-gradient(circle, rgba(200, 45, 140, 0.13), rgba(200, 45, 140, 0) 70%);
        }
        .cert-blob-b {
          width: 40cqw; height: 40cqw; bottom: -22cqw; left: -14cqw;
          background: radial-gradient(circle, rgba(80, 25, 160, 0.12), rgba(80, 25, 160, 0) 70%);
        }

        .cert-head { position: relative; display: flex; flex-direction: column; align-items: center; gap: 1.4cqw; }
        .cert-wordmark { display: inline-flex; align-items: baseline; gap: 0.9cqw; line-height: 1; }
        .cert-wordmark-logo { font-size: 3cqw; font-weight: 900; letter-spacing: 0.06em; color: #121212; }
        .cert-wordmark-product {
          font-size: 1.05cqw; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #7F19A0;
        }
        .cert-kicker {
          display: inline-block;
          padding: 0.6cqw 1.8cqw;
          font-size: 1.15cqw;
          font-weight: 700;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #7F19A0;
          background: #F1ECF9;
          border-radius: 999px;
        }

        .cert-main {
          position: relative;
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.9cqw;
          width: 100%;
        }
        .cert-lead { font-size: 1.55cqw; font-weight: 500; color: #6C6C6C; }
        .cert-name {
          max-width: 100%;
          font-size: 5.6cqw;
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.1;
          color: #121212;
          overflow-wrap: anywhere;
        }
        .cert-underline {
          display: block;
          width: 16cqw;
          height: 0.45cqw;
          margin: 0.3cqw 0 0.9cqw;
          border-radius: 999px;
          background: linear-gradient(90deg, #C82D8C, #7F19A0);
        }
        .cert-course {
          max-width: 80%;
          font-size: 2.7cqw;
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.2;
          color: #7F19A0;
        }

        .cert-foot {
          position: relative;
          width: 100%;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: end;
          gap: 3cqw;
        }
        .cert-foot-col {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 0.6cqw;
          padding-top: 0.9cqw;
          border-top: 0.12cqw solid #DCD5E6;
          text-align: left;
        }
        .cert-foot-right { align-items: flex-end; text-align: right; }
        .cert-foot-value { font-size: 1.6cqw; font-weight: 700; color: #121212; }
        .cert-signature { font-size: 1.6cqw; font-weight: 800; font-style: italic; letter-spacing: -0.01em; color: #121212; }
        .cert-foot-label {
          font-size: 0.95cqw; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #969696;
        }
        .cert-seal { width: 10.5cqw; height: 10.5cqw; margin-bottom: -0.4cqw; filter: drop-shadow(0 0.5cqw 1cqw rgba(127, 25, 160, 0.25)); }

        .cert-id {
          position: relative;
          margin-top: 1.6cqw;
          font-size: 0.95cqw;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #969696;
        }
        .cert-id span { font-family: var(--font-mono); letter-spacing: 0.04em; color: #6C6C6C; margin-left: 0.5cqw; }

        @media (max-width: 640px) {
          .cert-backdrop { padding: var(--space-3) var(--space-2); align-items: center; }
          .cert-dialog { padding: var(--space-4) var(--space-3); border-radius: var(--radius-xl); }
          .cert-toolbar { flex-wrap: wrap; }
          .cert-toolbar-title { font-size: 17px; }
          .cert-toolbar-actions { width: 100%; }
          .cert-toolbar-actions .btn { flex: 1; }
          .cert-toolbar-actions .modal-close { position: absolute; top: 12px; right: 12px; }
          .cert-dialog { position: relative; }
          .cert-print-btn { display: none; }
        }

        /* ---------- Print: only the certificate, landscape A4 ---------- */
        @media print {
          @page { size: A4 landscape; margin: 0; }
          html, body { background: #fff !important; overflow: visible !important; }
          body > *:not(.cert-portal) { display: none !important; }
          .cert-portal { display: block !important; }
          .cert-backdrop {
            position: static;
            display: block;
            padding: 0;
            overflow: visible;
            background: none;
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            animation: none;
          }
          .cert-dialog {
            max-width: none;
            padding: 0;
            margin: 0;
            border-radius: 0;
            box-shadow: none;
            animation: none;
          }
          .cert-toolbar, .cert-hint { display: none !important; }
          .cert-sheet {
            width: 297mm;
            height: 209mm;
            aspect-ratio: auto;
            border-radius: 0;
            box-shadow: none;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .cert-inner { border-radius: 0; }
        }
      `}</style>
    </div>,
    document.body
  );
}
