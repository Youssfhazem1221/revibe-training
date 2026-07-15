'use client';

/**
 * BadgesDisplay - Shows earned and unearned badges with progress
 */
export default function BadgesDisplay({ badges, showProgress = false }) {
  if (!badges || badges.length === 0) {
    return (
      <div className="badges-empty">
        <i className="material-icons">workspace_premium</i>
        <p>No badges yet. Start learning to earn achievements!</p>
      </div>
    );
  }

  const earnedBadges = badges.filter(b => b.isEarned);
  const unearnedBadges = badges.filter(b => !b.isEarned);

  return (
    <div className="badges-container">
      {/* Earned Badges */}
      {earnedBadges.length > 0 && (
        <div className="badges-section">
          <h3 className="badges-section-title">
            <i className="material-icons">stars</i>
            Earned Badges ({earnedBadges.length})
          </h3>
          <div className="badges-grid">
            {earnedBadges.map((badge) => (
              <div key={badge.id} className="badge-card earned">
                <div className="badge-icon" style={{ background: badge.color }}>
                  <i className="material-icons">{badge.icon}</i>
                </div>
                <div className="badge-info">
                  <h4 className="badge-name">{badge.name}</h4>
                  <p className="badge-description">{badge.description}</p>
                </div>
                <div className="badge-earned-checkmark">
                  <i className="material-icons">check_circle</i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unearned Badges (with progress) */}
      {showProgress && unearnedBadges.length > 0 && (
        <div className="badges-section">
          <h3 className="badges-section-title">
            <i className="material-icons">lock</i>
            Locked Badges ({unearnedBadges.length})
          </h3>
          <div className="badges-grid">
            {unearnedBadges.map((badge) => (
              <div key={badge.id} className="badge-card locked">
                <div className="badge-icon locked" style={{ opacity: 0.3 }}>
                  <i className="material-icons">{badge.icon}</i>
                </div>
                <div className="badge-info">
                  <h4 className="badge-name">{badge.name}</h4>
                  <p className="badge-description">{badge.description}</p>
                  {badge.target && (
                    <div className="badge-progress">
                      <div className="badge-progress-bar">
                        <div 
                          className="badge-progress-fill"
                          style={{ width: `${badge.progress}%` }}
                        />
                      </div>
                      <div className="badge-progress-text">
                        {badge.current} / {badge.target}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .badges-container {
          width: 100%;
        }

        .badges-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          text-align: center;
          background: var(--bg-lavender);
          border-radius: 16px;
        }

        .badges-empty i {
          font-size: 64px;
          color: var(--accent-pink);
          margin-bottom: 16px;
        }

        .badges-empty p {
          font-size: 14px;
          color: var(--text-muted);
          margin: 0;
        }

        .badges-section {
          margin-bottom: 32px;
        }

        .badges-section:last-child {
          margin-bottom: 0;
        }

        .badges-section-title {
          font-size: 20px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Poppins', sans-serif;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .badges-section-title i {
          font-size: 28px;
          color: var(--accent-pink);
        }

        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .badge-card {
          position: relative;
          background: white;
          border-radius: 16px;
          padding: 20px;
          display: flex;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .badge-card.earned {
          border: 2px solid transparent;
          background: linear-gradient(white, white), var(--gradient-hero);
          background-origin: padding-box, border-box;
          background-clip: padding-box, border-box;
        }

        .badge-card.earned:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(255, 46, 99, 0.2);
        }

        .badge-card.locked {
          opacity: 0.7;
        }

        .badge-icon {
          width: 64px;
          height: 64px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .badge-icon i {
          font-size: 36px;
          color: white;
        }

        .badge-icon.locked {
          filter: grayscale(100%);
        }

        .badge-info {
          flex: 1;
        }

        .badge-name {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Poppins', sans-serif;
          margin: 0 0 4px 0;
        }

        .badge-description {
          font-size: 13px;
          color: var(--text-muted);
          margin: 0;
          line-height: 1.4;
        }

        .badge-progress {
          margin-top: 12px;
        }

        .badge-progress-bar {
          height: 6px;
          background: var(--bg-lavender);
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 6px;
        }

        .badge-progress-fill {
          height: 100%;
          background: var(--gradient-hero);
          border-radius: 999px;
          transition: width 0.6s ease;
        }

        .badge-progress-text {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
        }

        .badge-earned-checkmark {
          position: absolute;
          top: 12px;
          right: 12px;
        }

        .badge-earned-checkmark i {
          font-size: 24px;
          color: #10B981;
        }

        @media (max-width: 768px) {
          .badges-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
