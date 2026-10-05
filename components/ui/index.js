'use client';

// Small shared UI primitives. Styling lives in app/globals.css (see DESIGN.md).
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

export { useConfirm } from './ConfirmDialog';

/** Full-screen branded loader for auth / first paint. */
export function PageLoader({ label = 'Loading' }) {
  return (
    <div className="page-loader" role="status" aria-label={label}>
      <div className="page-loader-mark">REVIBE</div>
      <div className="page-loader-bar" />
    </div>
  );
}

/**
 * Guards a page: shows the loader while auth resolves, sends signed-out users
 * to the sign-in page and non-trainers away from trainer-only pages.
 *
 *   <RequireAuth role="trainer">…</RequireAuth>
 */
export function RequireAuth({ role, children }) {
  const { user, isTrainer, loading } = useAuth();
  const router = useRouter();
  const allowed = !!user && (role !== 'trainer' || isTrainer);

  useEffect(() => {
    if (loading) return;
    if (!user) router.replace('/');
    else if (role === 'trainer' && !isTrainer) router.replace('/dashboard');
  }, [loading, user, isTrainer, role, router]);

  if (loading || !allowed) return <PageLoader />;
  return children;
}

export function Spinner({ size = 'md', white = false, className = '' }) {
  return (
    <span
      className={`spinner ${size === 'sm' ? 'spinner-sm' : ''} ${white ? 'spinner-white' : ''} ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}

export function Skeleton({ width = '100%', height = 16, radius, style, className = '' }) {
  return (
    <span
      className={`skeleton ${className}`}
      style={{ display: 'block', width, height, borderRadius: radius, ...style }}
      aria-hidden="true"
    />
  );
}

export function EmptyState({ icon = 'inbox', title, text, action }) {
  return (
    <div className="empty animate-fade-in">
      <div className="empty-icon"><i className="material-icons">{icon}</i></div>
      {title && <h3 className="empty-title">{title}</h3>}
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Avatar({ src, name = '', size = 36 }) {
  const initials = (name || '?')
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
  return (
    <span className="avatar" style={{ '--size': `${size}px` }} aria-hidden={!name}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} referrerPolicy="no-referrer" />
      ) : (
        initials
      )}
    </span>
  );
}

export function StatTile({ icon, label, value, unit, meta, tone }) {
  const tones = {
    pink: { background: 'var(--accent-pink-light)', color: 'var(--brand-magenta)' },
    green: { background: 'var(--color-success-light)', color: 'var(--color-success)' },
    orange: { background: 'var(--color-warning-light)', color: 'var(--color-warning)' },
    blue: { background: 'var(--color-info-light)', color: 'var(--color-info)' },
    dark: { background: 'var(--brand-ink)', color: '#fff' },
  };
  return (
    <div className="stat-tile">
      {icon && (
        <span className="stat-tile-icon" style={tones[tone]}>
          <i className="material-icons">{icon}</i>
        </span>
      )}
      <span className="stat-tile-value">
        {value}
        {unit && <small>{unit}</small>}
      </span>
      <span className="stat-tile-label">{label}</span>
      {meta && <span className="stat-tile-meta">{meta}</span>}
    </div>
  );
}

/** Relative "3h ago" style time. */
export function timeAgo(value) {
  if (!value) return 'Never';
  const date = value?.toDate ? value.toDate() : new Date(value);
  const diff = Date.now() - date.getTime();
  if (Number.isNaN(diff)) return '';
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined });
}

export function formatDate(value, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('en-GB', opts);
}

/** Time-of-day greeting for headers. */
export function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}
