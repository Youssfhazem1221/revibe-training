'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { submitFeedback, getUserMaterialFeedback } from '@/lib/feedback';
import { useAuth } from '@/contexts/AuthContext';
import { Spinner } from '@/components/ui';

const MAX_LENGTH = 500;
const LABELS = ['', 'Not for me', 'Needs work', 'It was okay', 'Really good', 'Loved it'];
const POSITIVE_TAGS = ['Clear and easy to follow', 'Great examples', 'Useful for my day-to-day', 'Just the right length'];
const IMPROVE_TAGS = ['Too long', 'Needs more examples', 'Some info is outdated', 'Hard to follow'];

function tagsFor(rating) {
  if (rating >= 4 || rating === 0) return POSITIVE_TAGS;
  if (rating <= 2) return IMPROVE_TAGS;
  return [POSITIVE_TAGS[0], POSITIVE_TAGS[2], IMPROVE_TAGS[0], IMPROVE_TAGS[1]];
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Rate a material (1–5 stars) with an optional comment.
 * Opens on the last slide for trainees, or from the viewer's "Rate" buttons.
 * Contract: submitFeedback(uid, materialId, rating, comment, userData, materialName)
 * then onSubmitSuccess().
 */
export default function FeedbackModal({ materialId, materialName, isOpen, onClose, onSubmitSuccess }) {
  // Stay mounted through the close animation; a fresh body per opening resets the form.
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);
  const [session, setSession] = useState(0);

  if (isOpen && !mounted) {
    setMounted(true);
    setSession((s) => s + 1);
  }

  useEffect(() => {
    if (isOpen) {
      const id = requestAnimationFrame(() => setShown(true));
      return () => cancelAnimationFrame(id);
    }
    if (!mounted) return undefined;
    const t = setTimeout(() => {
      setMounted(false);
      setShown(false);
    }, 260);
    return () => clearTimeout(t);
  }, [isOpen, mounted]);

  if (!mounted) return null;
  return (
    <FeedbackDialog
      key={session}
      active={isOpen && shown}
      materialId={materialId}
      materialName={materialName}
      onClose={onClose}
      onSubmitSuccess={onSubmitSuccess}
    />
  );
}

function FeedbackDialog({ active, materialId, materialName, onClose, onSubmitSuccess }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [existing, setExisting] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | submitting | success
  const [error, setError] = useState('');
  const dialogRef = useRef(null);
  const starRefs = useRef([]);

  const display = hover || rating;
  const firstName = (user?.displayName || '').split(' ')[0];

  // Prefill from an earlier rating (without clobbering anything typed meanwhile).
  useEffect(() => {
    if (!user || !materialId) return undefined;
    let cancelled = false;
    getUserMaterialFeedback(user.uid, materialId)
      .then((fb) => {
        if (cancelled || !fb) return;
        setExisting(fb);
        setRating((r) => r || fb.rating || 0);
        setComment((c) => c || fb.comment || '');
      })
      .catch((err) => console.error('Error loading existing feedback:', err));
    return () => { cancelled = true; };
  }, [user, materialId]);

  // Focus the stars on open, restore focus on close, Esc to dismiss, keep Tab inside.
  useEffect(() => {
    const previous = document.activeElement;
    const id = requestAnimationFrame(() => {
      const target = dialogRef.current?.querySelector('[role="radio"][tabindex="0"]');
      target?.focus();
    });
    return () => {
      cancelAnimationFrame(id);
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, []);

  useEffect(() => {
    if (status !== 'success') return undefined;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [status, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && status !== 'submitting') {
      e.stopPropagation();
      onClose();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = dialogRef.current?.querySelectorAll(
      'button:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]), [tabindex="0"]',
    );
    if (!focusable?.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };

  const choose = (n) => {
    setRating(n);
    setError('');
  };

  const onStarKey = (e, n) => {
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = Math.min(5, n + 1);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = Math.max(1, n - 1);
    if (e.key === 'Home') next = 1;
    if (e.key === 'End') next = 5;
    if (next == null) return;
    e.preventDefault();
    choose(next);
    starRefs.current[next]?.focus();
  };

  const toggleTag = (tag) => {
    setComment((c) => {
      if (c.includes(tag)) {
        return c.replace(new RegExp(`\\s*${escapeRe(tag)}\\.?`), '').trim();
      }
      const base = c.trim();
      const sep = !base ? '' : /[.!?]$/.test(base) ? ' ' : '. ';
      const next = `${base}${sep}${tag}.`;
      if (next.length > MAX_LENGTH) {
        toast.error('That would go over the 500 character limit.');
        return c;
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      setError('Pick a star rating first.');
      starRefs.current[1]?.focus();
      return;
    }
    if (!user) return;
    setStatus('submitting');
    setError('');
    try {
      await submitFeedback(
        user.uid,
        materialId,
        rating,
        comment.trim(),
        { displayName: user.displayName, email: user.email, photoURL: user.photoURL },
        materialName,
      );
      setStatus('success');
      onSubmitSuccess?.();
    } catch (err) {
      console.error('Error submitting feedback:', err);
      setStatus('idle');
      toast.error("Couldn't send your feedback. Please try again.");
    }
  };

  const remaining = MAX_LENGTH - comment.length;
  const busy = status === 'submitting';

  return (
    <div
      className={`modal-backdrop fb-backdrop ${active ? 'active' : ''}`}
      onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) onClose(); }}
    >
      <div
        ref={dialogRef}
        className="modal fb-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        aria-describedby="fb-subtitle"
        onKeyDown={handleKeyDown}
      >
        <button type="button" className="fb-close" onClick={onClose} aria-label="Close" disabled={busy}>
          <i className="material-icons" aria-hidden="true">close</i>
        </button>

        {status === 'success' ? (
          <div className="fb-success" role="status">
            <span className="fb-success-icon">
              <i className="material-icons" aria-hidden="true">check</i>
            </span>
            <h2 id="fb-title" className="fb-title">{firstName ? `Thanks, ${firstName}!` : 'Thanks for the feedback!'}</h2>
            <p id="fb-subtitle" className="fb-subtitle">
              Your {rating}-star rating helps trainers keep the material sharp.
            </p>
            <button type="button" className="btn btn-dark" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="fb-head">
              <span className="fb-icon">
                <i className="material-icons" aria-hidden="true">{existing ? 'rate_review' : 'celebration'}</i>
              </span>
              <p className="eyebrow">{existing ? 'Your feedback' : 'Quick feedback'}</p>
              <h2 id="fb-title" className="fb-title">{existing ? 'Update your rating' : 'How was this deck?'}</h2>
              <p id="fb-subtitle" className="fb-subtitle">
                <span className="fb-material">{materialName}</span>
                {existing ? ' · You can change your rating any time.' : ' · Takes ten seconds and helps trainers improve it.'}
              </p>
            </div>

            <div className="fb-rating">
              <div
                className="fb-stars"
                role="radiogroup"
                aria-label="Your rating"
                aria-describedby="fb-rating-label"
                onMouseLeave={() => setHover(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    ref={(el) => { starRefs.current[n] = el; }}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`${n} star${n > 1 ? 's' : ''}: ${LABELS[n]}`}
                    tabIndex={(rating || 1) === n ? 0 : -1}
                    className={`fb-star ${n <= display ? 'is-on' : ''} ${rating === n ? 'is-picked' : ''}`}
                    onMouseEnter={() => setHover(n)}
                    onClick={() => choose(n)}
                    onKeyDown={(e) => onStarKey(e, n)}
                  >
                    <i className="material-icons" aria-hidden="true">star</i>
                  </button>
                ))}
              </div>
              <p id="fb-rating-label" className={`fb-rating-label ${display ? 'is-set' : ''}`} aria-live="polite">
                {display ? LABELS[display] : 'Tap a star to rate'}
              </p>
            </div>

            <div className="fb-comment">
              <div className="fb-comment-head">
                <label htmlFor="fb-comment" className="field-label">Anything to add? <span>(optional)</span></label>
                <span
                  className={`fb-count ${remaining <= 50 ? 'is-warn' : ''} ${remaining <= 0 ? 'is-max' : ''}`}
                  aria-live="polite"
                >
                  {comment.length}/{MAX_LENGTH}
                </span>
              </div>
              <div className="fb-tags" role="group" aria-label="Quick tags">
                {tagsFor(display).map((tag) => {
                  const on = comment.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      className={`fb-tag ${on ? 'is-on' : ''}`}
                      onClick={() => toggleTag(tag)}
                      aria-pressed={on}
                    >
                      <i className="material-icons" aria-hidden="true">{on ? 'check' : 'add'}</i>
                      {tag}
                    </button>
                  );
                })}
              </div>
              <textarea
                id="fb-comment"
                className="textarea fb-textarea"
                placeholder="What worked? What could be clearer?"
                value={comment}
                onChange={(e) => setComment(e.target.value.slice(0, MAX_LENGTH))}
                rows={3}
                maxLength={MAX_LENGTH}
              />
            </div>

            {error && (
              <p className="fb-error" role="alert">
                <i className="material-icons" aria-hidden="true">error_outline</i> {error}
              </p>
            )}

            <div className="fb-actions">
              <button type="button" className="btn btn-ghost" onClick={onClose} disabled={busy}>
                {existing ? 'Cancel' : 'Skip for now'}
              </button>
              <button type="submit" className="btn btn-gradient" disabled={busy} aria-disabled={!rating}>
                {busy ? <Spinner size="sm" white /> : <i className="material-icons" aria-hidden="true">send</i>}
                {busy ? 'Sending…' : existing ? 'Update feedback' : 'Send feedback'}
              </button>
            </div>
          </form>
        )}
      </div>

      <style jsx>{`
        .fb-backdrop { z-index: calc(var(--z-modal) + 5); }
        .fb-dialog {
          position: relative;
          max-width: 520px;
          padding: var(--space-8) var(--space-8) var(--space-6);
        }
        .fb-close {
          position: absolute;
          top: 14px;
          right: 14px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-full);
          color: var(--text-muted);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .fb-close:hover { background: var(--bg-soft); color: var(--text-primary); }
        .fb-close .material-icons { font-size: 20px; }

        .fb-head { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 4px; }
        .fb-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          margin-bottom: 10px;
          border-radius: 18px;
          background: var(--gradient-hero);
          color: #fff;
          box-shadow: var(--shadow-glow-pink);
        }
        .fb-icon .material-icons { font-size: 28px; }
        .fb-title {
          font-family: var(--font-heading);
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.025em;
          line-height: 1.2;
          color: var(--text-primary);
        }
        .fb-subtitle { max-width: 40ch; font-size: 14px; line-height: 1.55; color: var(--text-muted); }
        .fb-material { font-weight: 700; color: var(--text-primary); }

        .fb-rating { display: flex; flex-direction: column; align-items: center; gap: 6px; margin: 22px 0 18px; }
        .fb-stars { display: flex; gap: 4px; }
        .fb-star {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 56px;
          height: 56px;
          border-radius: var(--radius-full);
          color: #DCD5E6;
          transition: transform 180ms var(--ease-spring), color var(--transition-fast), background var(--transition-fast);
        }
        .fb-star .material-icons { font-size: 44px; }
        .fb-star:hover { transform: scale(1.12); }
        .fb-star:active { transform: scale(0.92); }
        .fb-star.is-on { color: var(--color-star); }
        .fb-star.is-picked { animation: fbPop 360ms var(--ease-spring); }
        .fb-star:focus-visible { outline: none; background: var(--bg-lavender); box-shadow: var(--ring); }
        @keyframes fbPop { 0% { transform: scale(0.8); } 60% { transform: scale(1.2); } 100% { transform: scale(1); } }
        .fb-rating-label {
          min-height: 22px;
          font-family: var(--font-heading);
          font-size: 15px;
          font-weight: 700;
          color: var(--text-subtle);
          transition: color var(--transition-fast);
        }
        .fb-rating-label.is-set {
          background: var(--gradient-text);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .fb-comment { display: flex; flex-direction: column; gap: 10px; }
        .fb-comment-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
        .fb-comment-head .field-label { margin-bottom: 0; }
        .fb-comment-head .field-label span { font-weight: 500; color: var(--text-subtle); }
        .fb-count { font-size: 12px; font-weight: 600; color: var(--text-subtle); font-variant-numeric: tabular-nums; }
        .fb-count.is-warn { color: var(--color-warning); }
        .fb-count.is-max { color: var(--color-danger); }
        .fb-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .fb-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          height: 32px;
          padding: 0 12px 0 8px;
          border: 1.5px solid var(--border);
          border-radius: var(--radius-full);
          background: var(--bg-white);
          font-family: var(--font-heading);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-body);
          transition: border-color var(--transition-fast), background var(--transition-fast), color var(--transition-fast);
        }
        .fb-tag .material-icons { font-size: 16px; color: var(--text-subtle); }
        .fb-tag:hover { border-color: var(--brand-purple); color: var(--brand-purple); }
        .fb-tag.is-on { background: var(--bg-lavender); border-color: var(--brand-purple); color: var(--brand-purple); }
        .fb-tag.is-on .material-icons { color: var(--brand-purple); }
        .fb-textarea { min-height: 88px; font-size: 14px; }

        .fb-error {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 14px;
          padding: 10px 14px;
          border-radius: var(--radius-md);
          background: var(--color-danger-light);
          color: var(--color-danger);
          font-size: 13px;
          font-weight: 600;
        }
        .fb-error .material-icons { font-size: 18px; }

        .fb-actions { display: flex; justify-content: flex-end; gap: var(--space-3); margin-top: var(--space-6); }

        .fb-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: var(--space-4) 0 var(--space-2);
          text-align: center;
        }
        .fb-success .btn { margin-top: 14px; min-width: 140px; }
        .fb-success-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 72px;
          height: 72px;
          margin-bottom: 8px;
          border-radius: var(--radius-full);
          background: var(--gradient-hero);
          color: #fff;
          box-shadow: var(--shadow-glow-pink);
          animation: fbPop 480ms var(--ease-spring) both;
        }
        .fb-success-icon .material-icons { font-size: 38px; }

        @media (max-width: 560px) {
          .fb-dialog { padding: var(--space-6) var(--space-5) calc(var(--space-5) + env(safe-area-inset-bottom)); }
          .fb-title { font-size: 21px; }
          .fb-star { width: 52px; height: 52px; }
          .fb-star .material-icons { font-size: 40px; }
          .fb-actions > .btn { flex: 1; }
        }
      `}</style>
    </div>
  );
}
