'use client';

/**
 * ProgressBar: brand progress indicator for material completion.
 *
 *   <ProgressBar viewedPages={4} totalPages={12} size="sm" showLabel />
 *
 * Props (backwards compatible): viewedPages, totalPages, size 'sm'|'md'|'lg',
 * showLabel. Optional: unit ('pages' | 'slides'), label (override text).
 */
export default function ProgressBar({
  viewedPages = 0,
  totalPages = 0,
  size = 'md',
  showLabel = true,
  unit = 'pages',
  label,
}) {
  const percentage = totalPages > 0 ? Math.min(100, Math.round((viewedPages / totalPages) * 100)) : 0;
  const isCompleted = totalPages > 0 && percentage >= 100;
  const sizeClass = { sm: 'rv-progress-sm', md: 'rv-progress-md', lg: 'rv-progress-lg' }[size] || 'rv-progress-md';
  const text = label || (isCompleted ? 'Completed' : `${viewedPages} of ${totalPages} ${unit}`);

  return (
    <div className={`rv-progress ${sizeClass} ${isCompleted ? 'is-complete' : ''}`}>
      {showLabel && (
        <div className="rv-progress-head">
          <span className="rv-progress-label">
            {isCompleted && <i className="material-icons" aria-hidden="true">check_circle</i>}
            {text}
          </span>
          <span className="rv-progress-pct">{percentage}%</span>
        </div>
      )}

      <div
        className="rv-progress-track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percentage}
        aria-label={showLabel ? undefined : `${percentage}% complete`}
        aria-valuetext={`${percentage}% complete, ${viewedPages} of ${totalPages} ${unit}`}
      >
        <div className="rv-progress-fill" style={{ width: `${percentage}%` }} />
      </div>

      <style jsx>{`
        .rv-progress {
          width: 100%;
        }
        .rv-progress-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 8px;
          margin-bottom: 6px;
          font-size: 12px;
        }
        .rv-progress-label {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          min-width: 0;
          color: var(--text-muted);
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rv-progress-label .material-icons {
          font-size: 15px;
          color: var(--color-success);
        }
        .rv-progress-pct {
          font-family: var(--font-heading);
          font-size: 12px;
          font-weight: 800;
          color: var(--brand-purple);
          font-variant-numeric: tabular-nums;
        }
        .is-complete .rv-progress-pct,
        .is-complete .rv-progress-label {
          color: var(--color-success);
        }
        .rv-progress-track {
          width: 100%;
          height: 6px;
          background: var(--bg-lavender);
          border-radius: var(--radius-full);
          overflow: hidden;
        }
        .rv-progress-sm .rv-progress-track {
          height: 4px;
        }
        .rv-progress-lg .rv-progress-track {
          height: 8px;
        }
        .rv-progress-fill {
          height: 100%;
          min-width: 0;
          background: var(--gradient-brand-h);
          border-radius: inherit;
          transition: width 600ms var(--ease-out);
        }
        .is-complete .rv-progress-fill {
          background: var(--color-success);
        }
      `}</style>
    </div>
  );
}
