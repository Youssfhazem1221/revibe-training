'use client';

/**
 * ProgressBar - Visual progress indicator for material completion
 * Shows X/Y pages viewed with percentage bar
 */
export default function ProgressBar({ viewedPages = 0, totalPages = 0, size = 'md', showLabel = true }) {
  const percentage = totalPages > 0 ? Math.round((viewedPages / totalPages) * 100) : 0;
  const isCompleted = percentage >= 100;

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  const heightClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className="progress-bar-container">
      {showLabel && (
        <div className="progress-bar-header">
          <span className="progress-bar-label">
            {isCompleted ? (
              <>
                <i className="material-icons" style={{ fontSize: '14px', color: 'var(--accent-pink)' }}>check_circle</i>
                Completed
              </>
            ) : (
              <>
                {viewedPages} of {totalPages} pages viewed
              </>
            )}
          </span>
          <span className="progress-bar-percentage">
            {percentage}%
          </span>
        </div>
      )}
      
      <div className={`progress-bar-track ${heightClass}`}>
        <div 
          className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <style jsx>{`
        .progress-bar-container {
          width: 100%;
        }

        .progress-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
          font-size: 12px;
        }

        .progress-bar-label {
          color: var(--text-muted);
          font-weight: 500;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .progress-bar-percentage {
          color: var(--accent-pink);
          font-weight: 700;
          font-size: 13px;
        }

        .progress-bar-track {
          width: 100%;
          background: rgba(124, 58, 237, 0.1);
          border-radius: 999px;
          overflow: hidden;
          position: relative;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--accent-pink) 0%, var(--accent-purple) 100%);
          border-radius: 999px;
          transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
        }

        .progress-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }

        .progress-bar-fill.completed {
          background: linear-gradient(90deg, #10B981 0%, #059669 100%);
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .h-1 {
          height: 4px;
        }

        .h-2 {
          height: 6px;
        }

        .h-3 {
          height: 8px;
        }
      `}</style>
    </div>
  );
}
