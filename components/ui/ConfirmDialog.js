'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const ConfirmContext = createContext(null);

/**
 * Promise-based replacement for window.confirm():
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete material?', body: '…', confirmLabel: 'Delete', tone: 'danger' })) { … }
 */
export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside <ConfirmProvider>');
  return ctx;
}

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const [open, setOpen] = useState(false);
  const resolverRef = useRef(null);
  const confirmBtnRef = useRef(null);

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialog({
        title: 'Are you sure?',
        body: '',
        confirmLabel: 'Confirm',
        cancelLabel: 'Cancel',
        tone: 'default',
        icon: options.tone === 'danger' ? 'delete_outline' : 'help_outline',
        ...options,
      });
      requestAnimationFrame(() => setOpen(true));
    });
  }, []);

  const close = useCallback((result) => {
    setOpen(false);
    resolverRef.current?.(result);
    resolverRef.current = null;
    setTimeout(() => setDialog(null), 220);
  }, []);

  useEffect(() => {
    if (!open) return;
    confirmBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {dialog && (
        <div
          className={`modal-backdrop ${open ? 'active' : ''}`}
          style={{ zIndex: 'calc(var(--z-modal) + 10)' }}
          onMouseDown={(e) => e.target === e.currentTarget && close(false)}
        >
          <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" style={{ maxWidth: 420 }}>
            <div className={`confirm-icon ${dialog.tone === 'danger' ? 'danger' : ''}`}>
              <i className="material-icons">{dialog.icon}</i>
            </div>
            <h2 id="confirm-title" className="modal-title" style={{ marginBottom: 8 }}>{dialog.title}</h2>
            {dialog.body && <p className="modal-body" style={{ fontSize: 14, lineHeight: 1.6 }}>{dialog.body}</p>}
            <div className="modal-footer" style={{ marginTop: dialog.body ? 0 : 20 }}>
              <button className="btn btn-outline" onClick={() => close(false)}>{dialog.cancelLabel}</button>
              <button
                ref={confirmBtnRef}
                className={`btn ${dialog.tone === 'danger' ? 'btn-danger-solid' : 'btn-gradient'}`}
                onClick={() => close(true)}
              >
                {dialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
