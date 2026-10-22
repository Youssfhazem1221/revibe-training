'use client';

import { EmptyState } from '@/components/ui';

/** Friendly "what's left" line for a locked badge. */
function badgeHint(badge) {
  const { current = 0, target = 0, unit } = badge;
  if (!target) return badge.description;
  if (unit === '%') return `${current}% average so far`;
  const left = Math.max(0, target - current);
  const noun = unit || 'step';
  return `${left} more ${noun}${left === 1 ? '' : 's'} to unlock`;
}

/**
 * BadgesDisplay: earned badges are vibrant with a brand-gradient ring; locked
 * ones are greyed with a progress bar and a hint toward the requirement.
 */
export default function BadgesDisplay({ badges, showProgress = false }) {
  if (!badges || badges.length === 0) {
    return (
      <EmptyState
        icon="workspace_premium"
        title="No badges yet"
        text="Start a deck in the library to earn your first achievement."
      />
    );
  }

  // Declared inside the component so styled-jsx scopes its markup.
  const medallion = (badge, earned) => (
    <span
      className={`bd-medal ${earned ? 'is-earned' : 'is-locked'}`}
      style={earned ? { '--badge-color': badge.color } : undefined}
      aria-hidden="true"
    >
      <span className="bd-medal-core">
        <i className="material-icons">{badge.icon}</i>
      </span>
      {!earned && (
        <span className="bd-medal-lock">
          <i className="material-icons">lock</i>
        </span>
      )}
    </span>
  );

  const earned = badges.filter((b) => b.isEarned);
  const locked = badges.filter((b) => !b.isEarned);
  const pct = Math.round((earned.length / badges.length) * 100);
  // The locked badge you're closest to: nudge toward it.
  const nextUp = [...locked].sort((a, b) => (b.progress || 0) - (a.progress || 0))[0];

  return (
    <div className="bd">
      <div className="bd-summary">
        <div className="bd-summary-text">
          <span className="eyebrow">Your collection</span>
          <p className="bd-summary-title">
            <strong className="tabular">{earned.length}</strong> of {badges.length} badges earned
          </p>
          {nextUp ? (
            <p className="bd-summary-sub">
              Closest next: <strong>{nextUp.name}</strong> · {badgeHint(nextUp)}
            </p>
          ) : (
            <p className="bd-summary-sub">You&apos;ve collected every badge. Legendary.</p>
          )}
        </div>
        <div
          className="bd-summary-bar"
          role="progressbar"
          aria-label="Badges earned"
          aria-valuemin={0}
          aria-valuemax={badges.length}
          aria-valuenow={earned.length}
        >
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      {earned.length > 0 && (
        <section className="bd-section" aria-labelledby="bd-earned-title">
          <h3 id="bd-earned-title" className="bd-section-title">
            <i className="material-icons" aria-hidden="true">stars</i> Earned
            <span className="bd-count">{earned.length}</span>
          </h3>
          <ul className="bd-grid stagger">
            {earned.map((badge) => (
              <li key={badge.id} className="bd-card is-earned" style={{ '--badge-color': badge.color }}>
                {medallion(badge, true)}
                <span className="bd-name">{badge.name}</span>
                <span className="bd-desc">{badge.description}</span>
                <span className="badge badge-success bd-state">
                  <i className="material-icons" aria-hidden="true">check_circle</i> Earned
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showProgress && locked.length > 0 && (
        <section className="bd-section" aria-labelledby="bd-locked-title">
          <h3 id="bd-locked-title" className="bd-section-title">
            <i className="material-icons" aria-hidden="true">lock_open</i> Up for grabs
            <span className="bd-count">{locked.length}</span>
          </h3>
          <ul className="bd-grid stagger">
            {locked.map((badge) => (
              <li key={badge.id} className="bd-card is-locked">
                {medallion(badge, false)}
                <span className="bd-name">{badge.name}</span>
                <span className="bd-desc">{badge.description}</span>
                {badge.target > 0 && (
                  <span className="bd-progress">
                    <span
                      className="progress-bar"
                      role="progressbar"
                      aria-label={`${badge.name} progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={badge.progress || 0}
                    >
                      <span className="progress-bar-fill" style={{ width: `${badge.progress || 0}%` }} />
                    </span>
                    <span className="bd-progress-meta">
                      <span>{badgeHint(badge)}</span>
                      <span className="tabular">
                        {badge.unit === '%' ? `${badge.current}%` : `${badge.current}/${badge.target}`}
                      </span>
                    </span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <style jsx>{`
        .bd { display: flex; flex-direction: column; gap: var(--space-8); }

        .bd-summary {
          display: grid;
          grid-template-columns: 1fr minmax(160px, 260px);
          align-items: center;
          gap: var(--space-5);
          padding: var(--space-5) var(--space-6);
          background: var(--gradient-soft);
          border: 1px solid rgba(127, 25, 160, 0.1);
          border-radius: var(--radius-xl);
        }
        .bd-summary-text { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
        .bd-summary-title {
          font-family: var(--font-heading); font-size: 18px; font-weight: 700;
          letter-spacing: -0.015em; color: var(--text-primary);
        }
        .bd-summary-title strong { font-weight: 800; font-size: 22px; }
        .bd-summary-sub { font-size: 13px; color: var(--text-muted); }
        .bd-summary-sub strong { color: var(--text-primary); font-weight: 700; }
        .bd-summary-bar {
          height: 10px; border-radius: var(--radius-full);
          background: rgba(255, 255, 255, 0.85);
          box-shadow: inset 0 0 0 1px rgba(127, 25, 160, 0.1);
          overflow: hidden;
        }
        .bd-summary-bar span {
          display: block; height: 100%; border-radius: inherit;
          background: var(--gradient-brand-h);
          transition: width 700ms var(--ease-out);
        }

        .bd-section { display: flex; flex-direction: column; gap: var(--space-4); }
        .bd-section-title {
          display: flex; align-items: center; gap: 8px;
          font-family: var(--font-heading); font-size: 16px; font-weight: 700;
          letter-spacing: -0.01em; color: var(--text-primary);
        }
        .bd-section-title .material-icons { font-size: 20px; color: var(--brand-purple); }
        .bd-count {
          font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px;
          background: var(--bg-lavender); color: var(--brand-purple);
        }

        .bd-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--space-4);
        }

        .bd-card {
          position: relative;
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 6px;
          padding: var(--space-6) var(--space-4) var(--space-5);
          background: var(--bg-white);
          border: 1px solid var(--border);
          border-radius: var(--radius-xl);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
          transition: transform var(--transition-base), box-shadow var(--transition-base), border-color var(--transition-base);
        }
        .bd-card.is-earned::before {
          content: '';
          position: absolute; inset: 0 0 auto 0; height: 96px;
          background: radial-gradient(140px 80px at 50% 0%, color-mix(in srgb, var(--badge-color) 14%, transparent), transparent);
          pointer-events: none;
        }
        .bd-card.is-earned:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-lg);
          border-color: transparent;
        }
        .bd-card.is-locked { background: var(--bg-soft); box-shadow: none; }
        .bd-card.is-locked:hover { border-color: var(--border-strong); }

        .bd-name {
          margin-top: var(--space-2);
          font-family: var(--font-heading); font-size: 15px; font-weight: 700;
          letter-spacing: -0.01em; color: var(--text-primary);
        }
        .is-locked .bd-name { color: var(--text-body); }
        .bd-desc { font-size: 12.5px; line-height: 1.45; color: var(--text-muted); max-width: 26ch; }
        .bd-state { margin-top: var(--space-2); }

        .bd-progress { width: 100%; margin-top: auto; padding-top: var(--space-3); display: flex; flex-direction: column; gap: 6px; }
        .bd-progress .progress-bar { background: var(--border); }
        .bd-progress-meta {
          display: flex; justify-content: space-between; gap: 8px;
          font-size: 11.5px; font-weight: 600; color: var(--text-muted); text-align: left;
        }
        .bd-progress-meta .tabular { color: var(--brand-purple); font-weight: 700; }

        /* Medallion */
        .bd-medal {
          position: relative; display: inline-flex; flex-shrink: 0;
          width: 76px; height: 76px; padding: 4px; border-radius: 999px;
        }
        .bd-medal.is-earned {
          background: conic-gradient(from 210deg, #C82D8C, #7F19A0, #5019A0, #A267F4, #C82D8C);
          box-shadow: 0 8px 22px color-mix(in srgb, var(--badge-color) 30%, transparent);
        }
        .bd-medal.is-locked { background: var(--border-strong); }
        .bd-medal-core {
          width: 100%; height: 100%; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          border: 3px solid #fff;
        }
        .is-earned .bd-medal-core {
          background:
            radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.35), transparent 55%),
            var(--badge-color);
          color: #fff;
        }
        .is-locked .bd-medal-core { background: #E9E6EE; color: #B3ADBD; }
        .bd-medal-core .material-icons { font-size: 32px; }
        .bd-medal-lock {
          position: absolute; right: -2px; bottom: -2px;
          width: 26px; height: 26px; border-radius: 999px;
          display: flex; align-items: center; justify-content: center;
          background: var(--bg-white); color: var(--text-muted);
          box-shadow: var(--shadow-sm);
        }
        .bd-medal-lock .material-icons { font-size: 15px; }

        @media (max-width: 640px) {
          .bd { gap: var(--space-6); }
          .bd-summary { grid-template-columns: 1fr; padding: var(--space-5); }
          .bd-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-3); }
          .bd-card { padding: var(--space-5) var(--space-3) var(--space-4); }
          .bd-medal { width: 64px; height: 64px; }
          .bd-medal-core .material-icons { font-size: 26px; }
          .bd-progress-meta { flex-direction: column; gap: 2px; }
        }
      `}</style>
    </div>
  );
}
